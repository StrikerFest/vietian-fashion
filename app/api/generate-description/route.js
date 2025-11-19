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
        const productName = formData.get('name') || 'this product';

        // Optional: You could add a field for "Key Features" or "Style Notes" in the future
        // to guide the AI, but for now, we'll rely on the image.

        if (!imageFile) {
            return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
        }

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const mimeType = imageFile.type;
        const imagePart = await fileToGenerativePart(buffer, mimeType);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Act as a professional fashion copywriter for a modern e-commerce brand.
        Write a compelling, SEO-friendly product description for the clothing item shown in this image.
        
        Product Name: "${productName}"

        Guidelines:
        - Focus on the style, fit, material textures (visible in image), and versatility.
        - Suggest a potential occasion or styling tip.
        - Tone: Sophisticated, engaging, and persuasive.
        - Length: 3 to 4 concise sentences.
        - Do not include a title or headings, just the paragraph text.`;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const description = response.text().trim();

        return NextResponse.json({ description });

    } catch (error) {
        console.error('Error generating description:', error);
        return NextResponse.json({ error: 'Failed to generate description.', details: error.message }, { status: 500 });
    }
}