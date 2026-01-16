import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CONSOLIDATE_PROMPT = `
Bạn là một chuyên gia quản lý dữ liệu thời trang. Nhiệm vụ của bạn là chuẩn hóa và gộp các thẻ (tags) bị trùng lặp về mặt ý nghĩa.

Dưới đây là danh sách các thẻ hiện có trong hệ thống:
{{tagList}}

HÃY TÌM CÁC THẺ CÓ Ý NGHĨA GIỐNG NHAU (HOẶC GẦN GIỐNG NHAU) VÀ GỘP CHÚNG LẠI.
Nguyên tắc:
1. Gộp các từ đồng nghĩa (Ví dụ: "Basic", "Cơ bản", "Simple" -> Chọn "Cơ bản").
2. Gộp màu sắc cụ thể về màu chính (Ví dụ: "Xanh Navy", "Xanh Dương Đậm" -> "Xanh dương").
3. Gộp Anh-Việt (Ví dụ: "Cotton", "Vải Cotton" -> "Cotton").
4. Giữ lại từ phổ biến nhất, ngắn gọn nhất làm "Target".

Trả về kết quả dưới dạng JSON Map, trong đó:
- Key: Là thẻ cần BỎ (Duplicate/Bad).
- Value: Là thẻ cần GIỮ (Target/Good).

Ví dụ:
{
  "Basic": "Cơ bản",
  "Simple": "Cơ bản",
  "Xanh Navy": "Xanh dương",
  "Vải Cotton": "Cotton"
}

CHỈ TRẢ VỀ JSON. Nếu không có gì cần gộp, trả về {}.
`;

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // 1. Fetch ALL Attributes
        const { data: attributes, error: fetchError } = await supabase
            .from('categories')
            .select('id, name, slug')
            .eq('type', 'attribute')
            .eq('is_active', true)
            .is('parent_id', null); // Only fetch Groups first? No, we merge Values.
        
        // Actually we merge VALUES (children). Merging Groups is dangerous.
        // Let's fetch CHILDREN.
        const { data: attributeValues, error: valError } = await supabase
            .from('categories')
            .select('id, name, parent_id')
            .eq('type', 'attribute')
            .not('parent_id', 'is', null) // Only values
            .eq('is_active', true);

        if (valError) throw valError;

        if (attributeValues.length < 2) {
            return NextResponse.json({ message: 'Không đủ dữ liệu để gộp.', changes: 0 });
        }

        const tagNames = attributeValues.map(a => a.name);
        // Deduplicate names for prompt to avoid token waste
        const uniqueNames = [...new Set(tagNames)];
        const tagListStr = uniqueNames.join(', ');

        // 2. Run AI Analysis
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = CONSOLIDATE_PROMPT.replace('{{tagList}}', tagListStr);

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanedText = text.replace(/```json|```/g, '').trim();
        const mergeMap = JSON.parse(cleanedText);

        // 3. Execute Merge
        let changesCount = 0;
        const log = [];

        for (const [badTag, goodTag] of Object.entries(mergeMap)) {
            if (badTag === goodTag) continue;

            // Find IDs
            const badItems = attributeValues.filter(a => a.name.toLowerCase() === badTag.toLowerCase());
            const goodItems = attributeValues.filter(a => a.name.toLowerCase() === goodTag.toLowerCase());

            if (badItems.length === 0 || goodItems.length === 0) continue;

            // We might have multiple "Good" items (duplicates themselves) or multiple "Bad" items.
            // Logic: Merge ALL Bad Items into THE FIRST Good Item.
            const targetId = goodItems[0].id;

            for (const badItem of badItems) {
                if (badItem.id === targetId) continue;

                // A. Move Product Links (variant_attributes? product_categories?)
                // Schema uses `variant_attributes` (variant_id, attribute_value_id)
                // And `product_categories` (product_id, category_id)
                
                // 1. Update Product Categories (Direct Links)
                const { error: pcError } = await supabase
                    .from('product_categories')
                    .update({ category_id: targetId })
                    .eq('category_id', badItem.id);
                // Note: Update might fail if target link already exists (PK constraint).
                // If fail, we should DELETE the bad link (since good link exists).
                if (pcError && pcError.code === '23505') { // Unique violation
                     await supabase.from('product_categories').delete().eq('category_id', badItem.id);
                }

                // 2. Update Variant Attributes
                const { error: vaError } = await supabase
                    .from('variant_attributes')
                    .update({ attribute_value_id: targetId })
                    .eq('attribute_value_id', badItem.id);
                
                if (vaError && vaError.code === '23505') {
                    await supabase.from('variant_attributes').delete().eq('attribute_value_id', badItem.id);
                }

                // 3. Delete the Bad Tag
                await supabase.from('categories').delete().eq('id', badItem.id);
                
                changesCount++;
                log.push(`Merged "${badItem.name}" -> "${goodItems[0].name}"`);
            }
        }

        return NextResponse.json({ 
            message: `Hoàn tất gộp thẻ.`, 
            changes: changesCount, 
            details: log 
        });

    } catch (error) {
        console.error("Consolidate Tags Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
