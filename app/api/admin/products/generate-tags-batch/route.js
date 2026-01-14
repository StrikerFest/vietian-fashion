import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to clean slug
function generateSlug(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Prompt Template
const TAGS_PROMPT_TEMPLATE = `
Bạn là một chuyên gia thời trang.
Phân tích sản phẩm này: "{{productName}}" - "{{productDescription}}"

Nhiệm vụ: Tạo các thẻ (tags) thuộc tính CHỈ CHO CÁC NHÓM SAU ĐÂY:
{{targetAttributes}}

Yêu cầu:
1. Trả về JSON object: { "Tên Nhóm": ["Giá trị 1", "Giá trị 2"] }
2. Giá trị phải là Tiếng Việt chuẩn.
3. Nếu không xác định được, bỏ qua.
4. KHÔNG markdown.
`;

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Parse Body
    const { scope, limit = 10, ids = [], targetAttributes = [] } = await request.json();

    // 3. Setup Streaming
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendLog = async (msg, current = null, total = null) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ log: msg, current, total })}\n\n`));
    };

    // 4. Background Processing
    (async () => {
        try {
            await sendLog(`Đang khởi tạo quá trình...`);

            // A. Fetch Products
            let query = supabase
                .from('products')
                .select(`id, name, description, image_url`)
                .eq('status', 'active')
                .is('deleted_at', null);

            if (scope === 'selected') {
                query = query.in('id', ids);
            } else if (scope === 'limit') {
                query = query.order('id', { ascending: true }).limit(100); 
            }

            const { data: products } = await query;
            
            if (!products || products.length === 0) {
                await sendLog("Không tìm thấy sản phẩm nào.");
                await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'complete', stats: { processed: 0, errors: 0 } })}\n\n`));
                await writer.close();
                return;
            }

            let processed = 0;
            let errors = 0;
            let targetProducts = products;

            // Handle 'limit' scope skipping in code for simplicity in this version
            if (scope === 'limit') {
                // We'll filter the fetched products to find those without tags
                const filtered = [];
                for (const p of products) {
                    if (filtered.length >= limit) break;
                    const { count } = await supabase
                        .from('product_categories')
                        .select('category_id', { count: 'exact', head: true })
                        .eq('product_id', p.id);
                    if (count <= 1) filtered.push(p);
                }
                targetProducts = filtered;
            }

            const total = targetProducts.length;
            await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'start', total })}\n\n`));

            // B. Fetch Attribute Definitions
            const { data: allAttrs } = await supabase
                .from('categories')
                .select('id, name, parent_id')
                .eq('type', 'attribute');
            
            const attributeMap = new Map(); 
            allAttrs.forEach(a => attributeMap.set(a.name.toLowerCase(), a.id));

            // C. Processing Loop
            for (const product of targetProducts) {
                await sendLog(`Đang xử lý #${product.id}: ${product.name}`, processed, total);

                // Image Handling
                const imageUrl = product.image_url.startsWith('/') 
                    ? `${process.env.NEXT_PUBLIC_SITE_URL}${product.image_url}` // Local file logic needs server URL
                    : product.image_url;

                try {
                    const imgRes = await fetch(imageUrl);
                    if (!imgRes.ok) throw new Error('Image fetch failed');
                    const imgBuffer = await imgRes.arrayBuffer();

                    // Gemini Call
                    const prompt = TAGS_PROMPT_TEMPLATE
                        .replace('{{productName}}', product.name)
                        .replace('{{productDescription}}', product.description || '')
                        .replace('{{targetAttributes}}', targetAttributes.join(', '));

                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const result = await model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                data: Buffer.from(imgBuffer).toString("base64"),
                                mimeType: "image/jpeg"
                            },
                        },
                    ]);

                    const text = result.response.text();
                    const jsonStr = text.replace(/```json|```/g, '').trim();
                    const aiData = JSON.parse(jsonStr);

                    // Sync to DB
                    for (const [groupName, values] of Object.entries(aiData)) {
                        // 1. Find/Create Group
                        let groupId = attributeMap.get(groupName.toLowerCase());
                        if (!groupId) {
                            // Create Group
                            const slug = generateSlug(groupName);
                            const { data: newG } = await supabase.from('categories').insert({
                                name: groupName, slug, type: 'attribute', is_active: true
                            }).select().single();
                            if (newG) {
                                groupId = newG.id;
                                attributeMap.set(groupName.toLowerCase(), groupId);
                            }
                        }

                        if (!groupId) continue;

                        // 2. Find/Create Values
                        for (const val of values) {
                            const valSlug = generateSlug(val);
                            
                            // Check if value exists GLOBALLY by slug (regardless of parent)
                            const { data: existVal } = await supabase.from('categories')
                                .select('id, parent_id, name')
                                .eq('slug', valSlug)
                                .maybeSingle();
                            
                            let valId;
                            
                            if (existVal) {
                                valId = existVal.id;
                                
                                // Conflict Check: If parent differs, MOVE IT to the new group
                                if (existVal.parent_id !== groupId) {
                                    const { error: moveErr } = await supabase
                                        .from('categories')
                                        .update({ parent_id: groupId })
                                        .eq('id', valId);
                                    
                                    if (!moveErr) {
                                        await sendLog(`   ↪️ Moved tag "${existVal.name}" to group "${groupName}"`);
                                    } else {
                                        console.error("Move error:", moveErr);
                                    }
                                }
                            } else {
                                // Create New Value
                                const { data: newVal } = await supabase.from('categories').insert({
                                    name: val, slug: valSlug, type: 'attribute', parent_id: groupId, is_active: true
                                }).select().single();
                                valId = newVal?.id;
                            }

                            if (valId) {
                                // Link to Product (Ignore duplicates)
                                const { error: linkErr } = await supabase.from('product_categories').insert({
                                    product_id: product.id, category_id: valId
                                });
                                // Ignore error code 23505 (unique_violation)
                                if (linkErr && linkErr.code !== '23505') {
                                    console.error("Link error", linkErr);
                                }
                            }
                        }
                    }

                    processed++;
                    await sendLog(`✅ Tags added for #${product.id}`);

                } catch (e) {
                    console.error(e);
                    await sendLog(`❌ Error #${product.id}: ${e.message}`);
                    errors++;
                }
            }

            await writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'complete', stats: { processed, errors } })}\n\n`));
            await writer.close();

        } catch (err) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
            await writer.close();
        }
    })();

    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
