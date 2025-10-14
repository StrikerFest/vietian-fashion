// app/api/list-models/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const models = await genAI.listModels();

        const modelInfo = [];
        for await (const m of models) {
            modelInfo.push({
                name: m.name,
                supportedMethods: m.supportedGenerationMethods,
            });
        }

        return NextResponse.json({ availableModels: modelInfo });

    } catch (error) {
        console.error('Error listing models:', error);
        return NextResponse.json({ error: 'Failed to list models.', details: error.message }, { status: 500 });
    }
}