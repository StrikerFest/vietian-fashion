// app/api/products/generate/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: Convert File to Gemini-friendly format
async function fileToGenerativePart(file) {
    const arrayBuffer = await file.arrayBuffer();
    return {
        inlineData: {
            data: Buffer.from(arrayBuffer).toString("base64"),
            mimeType: file.type,
        },
    };
}

// Helper: Create a slug from a name
function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars
        .replace(/[\s_-]+/g, '-') // Replace spaces with dashes
        .replace(/^-+|-+$/g, ''); // Trim dashes
}

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        // --- A. AUTH CHECK ---
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Optional: Check if admin (if your RLS strictly requires it)
        // const { data: userRole } = await supabase.rpc('get_user_role');
        // if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // --- B. PARSE INPUT ---
        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
            return NextResponse.json({ error: 'Không có hình ảnh được cung cấp' }, { status: 400 });
        }

        // --- C. UPLOAD IMAGE TO STORAGE ---
        // We upload first so we have a URL for the database
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `generated/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, imageFile);

        if (uploadError) throw new Error(`Tải lên Bộ nhớ thất bại: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(fileName);

        // --- D. GEMINI VISION ANALYSIS ---
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const imagePart = await fileToGenerativePart(imageFile);

        const prompt = `
            You are an expert fashion merchandiser. Analyze this image and extract product data for an e-commerce database.
            
            Return a valid JSON object with the following fields:
            1. "name": A creative, SEO-friendly product name (max 60 chars).
            2. "description": A compelling 2-sentence marketing description.
            3. "category": The single most specific product category (e.g., "Bomber Jacket", "Maxi Dress", "Tote Bag").
            4. "color": The dominant color name.
            5. "tags": An array of 5-7 descriptive keywords (Material, Occasion, Style, Fit). 
               - EXAMPLE: ["Silk", "Vintage", "Evening", "Slim Fit", "Summer"].
               - Do NOT include the color here, as we have a separate field.
            6. "price_estimate": A numeric estimated price (USD) based on perceived quality (e.g. 45.00).

            IMPORTANT: 
            - Return ONLY raw JSON. No markdown formatting.
            - Be specific. Instead of "Shirt", use "Oxford Shirt".
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, '').trim(); // Clean markdown

        let aiData;
        try {
            aiData = JSON.parse(text);
        } catch (e) {
            console.error("JSON Parse Error:", text);
            throw new Error("AI trả về JSON không hợp lệ.");
        }

        // --- E. INTELLIGENT TAXONOMY SYNC ---

        /**
         * ensureCategory: Finds an existing category ID or creates a new one.
         */
        const ensureCategory = async (name, type, parentId = null) => {
            const slug = generateSlug(name);

            // 1. Try to find existing
            const { data: existing } = await supabase
                .from('categories')
                .select('id')
                .eq('type', type)
                .ilike('name', name) // Case-insensitive match
                .single();

            if (existing) return existing.id;

            // 2. Create new if missing
            const { data: newCat, error } = await supabase
                .from('categories')
                .insert({
                    name: name, // Capitalize first letter logic could go here
                    slug: slug + '-' + Math.floor(Math.random() * 1000), // Ensure unique slug
                    type: type,
                    parent_id: parentId,
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error(`Failed to create category ${name}:`, error);
                return null;
            }
            return newCat.id;
        };

        // 1. Handle Main Catalog Category (Navigation)
        const mainCategoryId = await ensureCategory(aiData.category, 'catalog');

        // 2. Handle Attributes (Color + Tags)
        const attributeIds = [];

        // 2a. Process Color
        // We assume a root "Color" category exists. If not, we might need to find/create it.
        // For simplicity, we'll search for a root category named "Color".
        const { data: colorRoot } = await supabase
            .from('categories')
            .select('id')
            .eq('name', 'Color')
            .is('parent_id', null)
            .single();

        if (colorRoot) {
            const colorId = await ensureCategory(aiData.color, 'attribute', colorRoot.id);
            if (colorId) attributeIds.push(colorId);
        }

        // 2b. Process Tags (as generic attributes or specific groups if we had them)
        // We will put them under a "General" attribute group or just flat attributes if your UI handles that.
        // Let's assume there is a "Tags" root attribute group.
        let { data: tagsRoot } = await supabase
            .from('categories')
            .select('id')
            .eq('name', 'Tags')
            .is('parent_id', null)
            .single();

        // If "Tags" root doesn't exist, create it once
        if (!tagsRoot) {
            const { data: newRoot } = await supabase.from('categories').insert({ name: 'Tags', type: 'attribute', slug: 'tags-root' }).select().single();
            tagsRoot = newRoot;
        }

        if (tagsRoot && aiData.tags) {
            for (const tag of aiData.tags) {
                const tagId = await ensureCategory(tag, 'attribute', tagsRoot.id);
                if (tagId) attributeIds.push(tagId);
            }
        }

        // --- F. DATABASE INSERTION (TRANSACTIONAL-LIKE) ---

        // 1. Insert Product
        const { data: product, error: prodError } = await supabase
            .from('products')
            .insert({
                name: `[G] ${aiData.name}`, // The [G] marker
                description: aiData.description,
                status: 'draft', // Force draft
                seo_title: aiData.name,
                image_url: publicUrl // Main image
            })
            .select()
            .single();

        if (prodError) throw prodError;

        // 2. Insert Image Record (Gallery)
        await supabase.from('product_images').insert({
            product_id: product.id,
            image_url: publicUrl,
            is_primary: true
        });

        // 3. Insert Default Variant (So it has a price)
        const { data: variant, error: varError } = await supabase
            .from('product_variants')
            .insert({
                product_id: product.id,
                sku: `GEN-${Date.now()}-${Math.floor(Math.random() * 999)}`,
                price: aiData.price_estimate || 0
            })
            .select()
            .single();

        if (varError) throw varError;

        // 4. Initialize Inventory
        await supabase.from('inventory_levels').insert({
            variant_id: variant.id,
            on_hand: 0 // Drafts start with 0 stock for safety
        });

        // 5. Link Main Category
        if (mainCategoryId) {
            await supabase.from('product_categories').insert({
                product_id: product.id,
                category_id: mainCategoryId
            });
        }

        // 6. Link Attributes (Color & Tags) to the VARIANT
        // (Your schema links attributes to variants, not products directly)
        if (attributeIds.length > 0) {
            const variantAttributes = attributeIds.map(attrId => ({
                variant_id: variant.id,
                attribute_value_id: attrId
            }));
            await supabase.from('variant_attributes').insert(variantAttributes);
        }

        return NextResponse.json({ success: true, product, aiData });

    } catch (error) {
        console.error("AI Generation Failed:", error);
        return NextResponse.json({ error: error.message || 'Lỗi máy chủ nội bộ' }, { status: 500 });
    }
}