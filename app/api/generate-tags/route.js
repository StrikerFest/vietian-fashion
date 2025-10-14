// app/api/generate-tags/route.js
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
        const productName = formData.get('name');
        const productDescription = formData.get('description');

        if (!imageFile) {
            return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
        }

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const mimeType = imageFile.type;
        const imagePart = await fileToGenerativePart(buffer, mimeType);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Analyze this image of a clothing item, along with its name and description.
        Name: "${productName}"
        Description: "${productDescription}"
        Based on all this information, identify key attributes for an e-commerce store.
        Generate tags for: item type, color, fabric/material, style (e.g., casual, formal), pattern, and appropriate season.
        Return these attributes as a clean JSON array of lowercase strings. For example: ["shirt", "blue", "denim", "casual", "long-sleeve", "autumn"].
        Do not include markdown formatting in your response.`;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        const cleanedText = text.replace(/```json|```/g, '').trim();
        const tags = JSON.parse(cleanedText);

        return NextResponse.json({ tags });

    } catch (error) {
        console.error('Error generating tags:', error);
        return NextResponse.json({ error: 'Failed to generate tags.', details: error.message }, { status: 500 });
    }
}