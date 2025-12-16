// app/api/products/generate/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_PRODUCT_GENERATE_PROMPT } from '@/utils/ai-prompts';

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

// --- NEW: Helper to ensure SKU Uniqueness ---
async function ensureUniqueSku(supabase) {
    let isUnique = false;
    let sku = '';
    let attempts = 0;

    while (!isUnique && attempts < 5) {
        // Generate candidate: GEN-{timestamp}-{random}
        sku = `GEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Check DB
        const { data } = await supabase
            .from('product_variants')
            .select('sku')
            .eq('sku', sku)
            .maybeSingle(); // distinct from .single(), doesn't throw if not found

        if (!data) {
            isUnique = true;
        } else {
            attempts++;
            // Wait 1ms to ensure Date.now() changes if loop runs fast
            await new Promise(r => setTimeout(r, 2));
        }
    }

    if (!isUnique) throw new Error("Không thể tạo SKU duy nhất sau nhiều lần thử.");
    return sku;
}
// ---------------------------------------------

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        // --- A. AUTH CHECK ---
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // --- B. PARSE INPUT ---
        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
            return NextResponse.json({ error: 'Không có hình ảnh được cung cấp' }, { status: 400 });
        }

        // --- C. UPLOAD IMAGE TO STORAGE ---
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

        // Fetch Prompt
        const { data: promptSetting } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'prompt_product_generate')
            .single();

        const prompt = promptSetting?.value || DEFAULT_PRODUCT_GENERATE_PROMPT;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, '').trim();

        let aiData;
        try {
            aiData = JSON.parse(text);
        } catch (e) {
            console.error("JSON Parse Error:", text);
            throw new Error("AI trả về JSON không hợp lệ.");
        }

        // --- E. INTELLIGENT TAXONOMY SYNC ---
        const ensureCategory = async (name, type, parentId = null) => {
            if (!name) return null;
            const slugBase = generateSlug(name);

            let query = supabase
                .from('categories')
                .select('id')
                .eq('type', type)
                .ilike('name', name);

            if (parentId) {
                query = query.eq('parent_id', parentId);
            } else {
                query = query.is('parent_id', null);
            }

            const { data: existing } = await query.maybeSingle(); // Changed to maybeSingle for safety
            if (existing) return existing.id;

            const { data: newCat, error } = await supabase
                .from('categories')
                .insert({
                    name: name,
                    slug: `${slugBase}-${Math.floor(Math.random() * 1000)}`,
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

        const mainCategoryId = await ensureCategory(aiData.category, 'catalog');

        const attributeIds = [];
        if (aiData.attributes && typeof aiData.attributes === 'object') {
            for (const [groupName, valueName] of Object.entries(aiData.attributes)) {
                const groupId = await ensureCategory(groupName, 'attribute', null);
                if (groupId && valueName) {
                    const valueId = await ensureCategory(valueName, 'attribute', groupId);
                    if (valueId) attributeIds.push(valueId);
                }
            }
        }

        // --- F. DATABASE INSERTION ---

        // 1. Insert Product
        const { data: product, error: prodError } = await supabase
            .from('products')
            .insert({
                name: `[AI] ${aiData.name}`,
                description: aiData.description,
                status: 'draft',
                seo_title: aiData.name,
                image_url: publicUrl
            })
            .select()
            .single();

        if (prodError) throw prodError;

        // 2. Insert Image Record
        await supabase.from('product_images').insert({
            product_id: product.id,
            image_url: publicUrl,
            is_primary: true
        });

        // 3. Insert Default Variant (WITH VALIDATED UNIQUE SKU)
        const uniqueSku = await ensureUniqueSku(supabase);

        const { data: variant, error: varError } = await supabase
            .from('product_variants')
            .insert({
                product_id: product.id,
                sku: uniqueSku, // Used the checked SKU
                price: aiData.price_estimate || 0
            })
            .select()
            .single();

        if (varError) throw varError;

        // 4. Initialize Inventory
        await supabase.from('inventory_levels').insert({
            variant_id: variant.id,
            on_hand: 0
        });

        // 5. Link Main Category
        if (mainCategoryId) {
            await supabase.from('product_categories').insert({
                product_id: product.id,
                category_id: mainCategoryId
            });
        }

        // 6. Link Attributes
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