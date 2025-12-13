// app/api/generate-description/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');
        const productName = formData.get('name') || 'Sản phẩm này';

        if (!imageFile) {
            return NextResponse.json({ error: 'Không có tệp hình ảnh được cung cấp.' }, { status: 400 });
        }

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const mimeType = imageFile.type;
        const imagePart = await fileToGenerativePart(buffer, mimeType);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Vietnamese Prompt
        const prompt = `Đóng vai trò là một chuyên gia viết nội dung (copywriter) cho một thương hiệu thời trang hiện đại tại Việt Nam.
        Viết một đoạn mô tả sản phẩm hấp dẫn, chuẩn SEO cho mặt hàng trong hình ảnh này.
        
        Tên sản phẩm: "${productName}"

        Hướng dẫn:
        - Tập trung vào kiểu dáng, form dáng, chất liệu (quan sát được từ ảnh) và tính ứng dụng.
        - Gợi ý dịp sử dụng phù hợp hoặc cách phối đồ nhanh.
        - Giọng văn: Tinh tế, chuyên nghiệp, lôi cuốn và thuyết phục.
        - Ngôn ngữ: Hoàn toàn bằng Tiếng Việt.
        - Độ dài: 3 đến 4 câu văn ngắn gọn, súc tích.
        - Không bao gồm tiêu đề hay định dạng markdown, chỉ trả về nội dung đoạn văn.`;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const description = response.text().trim();

        return NextResponse.json({ description });

    } catch (error) {
        console.error('Error generating description:', error);
        return NextResponse.json({ error: 'Tạo mô tả thất bại.', details: error.message }, { status: 500 });
    }
}