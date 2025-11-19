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

        // Updated prompt with comprehensive fashion attributes
        const prompt = `Analyze this image of a clothing item alongside its name and description.
        Name: "${productName}"
        Description: "${productDescription}"

        Identify key attributes for an e-commerce store. Extract tags for the following categories if applicable:
        1. Category/Type (e.g., Maxi Dress, Bomber Jacket)
        2. Color Nuance (e.g., Emerald Green, Pastel Pink, Navy)
        3. Fit/Silhouette (e.g., Oversized, Slim-fit, A-line, Boxy)
        4. Pattern Nuance (e.g., Houndstooth, Floral, Pinstripe)
        5. Fabric/Texture (e.g., Ribbed Knit, Satin finish, Distressed Denim)
        6. Construction Features (e.g., Pleated, Double-breasted, Raglan sleeves)
        7. Embellishment (e.g., Sequins, Embroidery, Ruffles)
        8. Style/Aesthetic (e.g., Y2K, Minimalist, Bohemian, Streetwear)
        9. Occasion Suitability (e.g., Evening wear, Office-appropriate, Beach day)
        10. Condition/Visual Wear (e.g., Vintage look, Acid wash)
        11. Season (e.g., Autumn, Transitional)

        Return these attributes as a clean JSON array of lowercase strings. 
        Example: ["maxi dress", "emerald green", "satin finish", "pleated bodice", "evening wear", "autumn"].
        Do not include the category names (like "Color Nuance") in the tags, just the values.
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