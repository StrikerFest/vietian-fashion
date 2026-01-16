// app/api/generate-tags/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { DEFAULT_TAGS_PROMPT } from '@/utils/ai-prompts'; // --- NEW ---

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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');
        const productName = formData.get('name');
        const productDescription = formData.get('description');

        if (!imageFile) {
            return NextResponse.json({ error: 'Không có tệp hình ảnh được cung cấp.' }, { status: 400 });
        }

        // 1. Fetch Dynamic Attributes (Groups AND Options)
        const { data: allAttributes, error: dbError } = await supabase
            .from('categories')
            .select('id, name, parent_id')
            .eq('type', 'attribute')
            .eq('is_active', true);

        if (dbError) throw dbError;

        // Build Hierarchy Map
        const groups = {};
        allAttributes.forEach(attr => {
            if (!attr.parent_id) {
                groups[attr.id] = { name: attr.name, options: [] };
            }
        });

        allAttributes.forEach(attr => {
            if (attr.parent_id && groups[attr.parent_id]) {
                groups[attr.parent_id].options.push(attr.name);
            }
        });

        // Format for Prompt
        const attributeList = Object.values(groups)
            .map(g => {
                const optionsStr = g.options.length > 0 
                    ? ` (Đã có: ${g.options.slice(0, 30).join(', ')}${g.options.length > 30 ? '...' : ''})` 
                    : '';
                return `- ${g.name}${optionsStr}`;
            })
            .join('\n');

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const mimeType = imageFile.type;
        const imagePart = await fileToGenerativePart(buffer, mimeType);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // --- NEW: FETCH AND PROCESS PROMPT ---
        const { data: promptSetting } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'prompt_generate_tags')
            .single();

        let promptTemplate = promptSetting?.value || DEFAULT_TAGS_PROMPT;

        // Replace placeholders
        const prompt = promptTemplate
            .replace(/{{productName}}/g, productName || '')
            .replace(/{{productDescription}}/g, productDescription || '')
            .replace(/{{attributeList}}/g, attributeList);
        // -------------------------------------

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        const cleanedText = text.replace(/```json|```/g, '').trim();
        const structuredTags = JSON.parse(cleanedText);

        return NextResponse.json({ data: structuredTags });

    } catch (error) {
        console.error("Generate Tags Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}