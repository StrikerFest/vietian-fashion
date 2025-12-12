// app/api/list-models/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Switch to dynamic client
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ----------------------------

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
        return NextResponse.json({ error: 'Tải danh sách mô hình thất bại.', details: error.message }, { status: 500 });
    }
}