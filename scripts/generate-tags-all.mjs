import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

// --- CONFIG ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
    console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- UTILS ---
function generateSlug(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[ _]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function fetchImageBuffer(url) {
    // Handle Local Files (from seed)
    if (url.startsWith('/')) {
        try {
            const localPath = path.join(process.cwd(), 'public', url);
            if (fs.existsSync(localPath)) {
                return fs.readFileSync(localPath);
            }
            console.error(`   Local file not found: ${localPath}`);
            return null;
        } catch (e) {
            console.error(`   Error reading local file ${url}:`, e.message);
            return null;
        }
    }

    // Handle Remote URLs
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        return await response.arrayBuffer();
    } catch (e) {
        console.error(`   Error downloading ${url}:`, e.message);
        return null;
    }
}

// --- PROMPT TEMPLATE (Inline from utils/ai-prompts.js) ---
const DEFAULT_TAGS_PROMPT = `Bạn là một chuyên gia thời trang tại Việt Nam. 
Hãy phân tích hình ảnh, tên và mô tả của sản phẩm này.

Tên: "{{productName}}"
Mô tả: "{{productDescription}}"

Nhiệm vụ của bạn là phân loại sản phẩm này theo các Nhóm Thuộc Tính sau đây:
{{attributeList}}

Hướng dẫn quan trọng:
1. **Ngôn ngữ**: Tất cả các giá trị (values) trả về PHẢI là Tiếng Việt chuẩn.
2. **Định dạng**: Trả về duy nhất một JSON object hợp lệ.
3. **Ngắn gọn**: Các tag chỉ được phép từ 1-4 từ. KHÔNG viết câu.
4. **Values**: Giá trị phải là mảng các chuỗi (Array of Strings).
   - Ví dụ: Thay vì "Blue", hãy trả về ["Xanh dương"].
   - Thay vì "Cotton", hãy trả về ["Vải Cotton", "Thoáng mát"].
5. Nếu không xác định được thuộc tính nào, hãy bỏ qua key đó.
6. Không sử dụng markdown code block.

Ví dụ định dạng mong muốn:
{
  "Màu sắc": ["Xanh Navy", "Trắng"],
  "Chất liệu": ["Kaki", "Thun"]
}`;

// --- MAIN ---
async function main() {
    const force = process.argv.includes('--force');
    const limit = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '1000');

    console.log("🚀 Starting Tag Generation...");

    // 1. Fetch Attributes (Parents) for Prompt
    const { data: attributeGroups } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', 'attribute')
        .is('parent_id', null);

    const attributeList = attributeGroups.map(a => `- ${a.name}`).join('\n');
    console.log(`📋 Found ${attributeGroups.length} attribute groups.`);

    // 2. Fetch Products
    // Only fetch products that are active and not deleted
    let query = supabase
        .from('products')
        .select(
            `
            id, name, description, image_url,
            product_categories (category_id)
        `)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('id', { ascending: true }) // Stable order
        .limit(limit);

    const { data: products, error } = await query;
    if (error) {
        console.error("Fetch products failed:", error);
        return;
    }

    console.log(`📦 Fetched ${products.length} products to check.`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const product of products) {
        // Skip if already has tags (unless --force)
        // Check if product_categories contains ANY attribute category
        // (Assuming we might need to check category types, but for now simple check count > 0 is a heuristic)
        // Better: Assuming 'product_categories' contains IDs.
        const existingCatIds = new Set(product.product_categories.map(pc => pc.category_id));
        
        // If we want to be strict, we check if these IDs belong to 'attribute' type.
        // But for speed, let's assume if it has > 2 categories (1 catalog + 1 attr), it "has tags".
        // Or simpler: if !force and existingCatIds.size > 1, skip.
        if (!force && existingCatIds.size > 1) {
            skippedCount++;
            process.stdout.write('.');
            continue;
        }

        if (!product.image_url) {
            console.log(`\n⚠️  Product #${product.id} "${product.name}" has no image. Skipping.`);
            errorCount++;
            continue;
        }

        console.log(`\n🎨 Processing Product #${product.id}: ${product.name}...`);

        // A. Download Image
        const imageBuffer = await fetchImageBuffer(product.image_url);
        if (!imageBuffer) {
            errorCount++;
            continue;
        }

        // B. Generate Tags
        try {
            const prompt = DEFAULT_TAGS_PROMPT
                .replace(/{{productName}}/g, product.name || '')
                .replace(/{{productDescription}}/g, product.description || '')
                .replace(/{{attributeList}}/g, attributeList);

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: Buffer.from(imageBuffer).toString("base64"),
                        mimeType: "image/jpeg" // Assuming jpeg/png, standard for Gemini
                    },
                },
            ]);
            
            const text = result.response.text();
            const cleanedText = text.replace(/```json|```/g, '').trim();
            const tagsData = JSON.parse(cleanedText);

            // C. Sync to DB
            const newCategoryLinks = [];

            for (const [groupName, values] of Object.entries(tagsData)) {
                if (!Array.isArray(values)) continue;

                // 1. Find/Create Group (Parent Category)
                let groupId;
                // Try case-insensitive match from loaded list
                const existingGroup = attributeGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
                
                if (existingGroup) {
                    groupId = existingGroup.id;
                } else {
                    // Create new Group
                    const slug = generateSlug(groupName);
                    const { data: newGroup, error: grpErr } = await supabase
                        .from('categories')
                        .insert({ name: groupName, slug, type: 'attribute', is_active: true })
                        .select()
                        .single();
                    
                    if (grpErr) {
                        console.error(`   ❌ Failed to create group "${groupName}":`, grpErr.message);
                        continue;
                    }
                    groupId = newGroup.id;
                    attributeGroups.push(newGroup); // Cache it
                    console.log(`   ➕ Created Group: ${groupName}`);
                }

                // 2. Find/Create Values (Child Categories)
                for (const val of values) {
                    const valSlug = generateSlug(val);
                    
                    // Check if exists
                    const { data: existingVal } = await supabase
                        .from('categories')
                        .select('id')
                        .eq('type', 'attribute')
                        .eq('parent_id', groupId)
                        .eq('slug', valSlug) // Slug is safer for uniqueness
                        .maybeSingle();

                    let valId;
                    if (existingVal) {
                        valId = existingVal.id;
                    } else {
                        // Create Value
                        const { data: newVal, error: valErr } = await supabase
                            .from('categories')
                            .insert({
                                name: val, 
                                slug: valSlug, 
                                type: 'attribute', 
                                parent_id: groupId, 
                                is_active: true 
                            })
                            .select()
                            .single();
                        
                        if (valErr) {
                            console.error(`   ❌ Failed to create tag "${val}":`, valErr.message);
                            continue;
                        }
                        valId = newVal.id;
                        console.log(`   ➕ Created Tag: ${val}`);
                    }

                    if (!existingCatIds.has(valId)) {
                        newCategoryLinks.push({ product_id: product.id, category_id: valId });
                        existingCatIds.add(valId); // Prevent duplicates in this run
                    }
                }
            }

            // D. Insert Links
            if (newCategoryLinks.length > 0) {
                const { error: linkErr } = await supabase.from('product_categories').insert(newCategoryLinks);
                if (linkErr) {
                    console.error("   ❌ Link Error:", linkErr.message);
                } else {
                    console.log(`   ✅ Added ${newCategoryLinks.length} tags.`);
                }
            } else {
                console.log("   Info: No new tags to add.");
            }

            processedCount++;
            
            // Rate Limit Delay
            await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
            console.error(`   ❌ Error processing product ${product.id}:`, e.message);
            errorCount++;
        }
    }

    console.log("\n--- DONE ---");
    console.log(`Processed: ${processedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
}

main();
