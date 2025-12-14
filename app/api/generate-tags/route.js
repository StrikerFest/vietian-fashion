// app/api/generate-tags/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function fileToGenerativePart(fileBuffer, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fileBuffer).toString("base64"),
            mimeType
        },
    };
}

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // ----------------------------

    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');
        const productName = formData.get('name');
        const productDescription = formData.get('description');

        if (!imageFile) {
            return NextResponse.json({ error: 'Không có tệp hình ảnh được cung cấp.' }, { status: 400 });
        }

        // 1. Fetch Dynamic Attributes from Database
        const { data: attributes, error: dbError } = await supabase
            .from('categories')
            .select('name')
            .eq('type', 'attribute')
            .is('parent_id', null)
            .eq('is_active', true);

        if (dbError) throw dbError;

        // Format attributes for the prompt
        const attributeList = attributes && attributes.length > 0
            ? attributes.map(a => `- ${a.name}`).join('\n')
            : '- Màu sắc\n- Chất liệu\n- Kiểu dáng'; // Vietnamese fallback

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const mimeType = imageFile.type;
        const imagePart = await fileToGenerativePart(buffer, mimeType);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 2. Construct Dynamic Prompt (Vietnamese Instructions)
        const prompt = `Bạn là một chuyên gia thời trang tại Việt Nam. 
        Hãy phân tích hình ảnh, tên và mô tả của sản phẩm này.
        
        Tên: "${productName}"
        Mô tả: "${productDescription}"

        Nhiệm vụ của bạn là phân loại sản phẩm này theo các Nhóm Thuộc Tính sau đây:
        ${attributeList}
        
        Hướng dẫn quan trọng:
        1. **Ngôn ngữ**: Tất cả các giá trị (values) trả về PHẢI là Tiếng Việt chuẩn.
        2. **Định dạng**: Trả về duy nhất một JSON object hợp lệ.
        3. **Keys**: Tên các key trong JSON phải KHỚP CHÍNH XÁC với tên Nhóm Thuộc Tính được liệt kê ở trên (giữ nguyên ngôn ngữ gốc của tên nhóm nếu có).
        4. **Values**: Giá trị phải là mảng các chuỗi (Array of Strings).
           - Ví dụ: Thay vì "Blue", hãy trả về "Xanh dương".
           - Thay vì "Cotton", hãy trả về "Vải Cotton".
        5. Nếu không xác định được thuộc tính nào, hãy bỏ qua key đó.
        6. Không sử dụng markdown code block.
        
        Ví dụ định dạng mong muốn:
        {
          "${attributes?.[0]?.name || 'Màu sắc'}": ["Xanh Navy", "Trắng"],
          "${attributes?.[1]?.name || 'Chất liệu'}": ["Kaki", "Thun"]
        }`;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean up result
        const cleanedText = text.replace(/```json|```/g, '').trim();
        const structuredTags = JSON.parse(cleanedText);

        return NextResponse.json({ data: structuredTags });

    } catch (error) {
        console.error("Generate Tags Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}