// app/api/generate-description/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { DEFAULT_DESCRIPTION_PROMPT } from '@/utils/ai-prompts'; // --- NEW ---

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
    // --- NEW: Need supabase to fetch settings ---
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    // --------------------------------------------

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

        // --- NEW: FETCH AND PROCESS PROMPT ---
        const { data: promptSetting } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'prompt_generate_description')
            .single();

        let promptTemplate = promptSetting?.value || DEFAULT_DESCRIPTION_PROMPT;

        const prompt = promptTemplate.replace(/{{productName}}/g, productName);
        // -------------------------------------

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const description = response.text().trim();

        return NextResponse.json({ description });

    } catch (error) {
        console.error('Error generating description:', error);
        return NextResponse.json({ error: 'Tạo mô tả thất bại.', details: error.message }, { status: 500 });
    }
}