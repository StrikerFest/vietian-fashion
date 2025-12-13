// app/api/generate-tags/route.js
import {NextResponse} from 'next/server';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs'; // Switch client
import {cookies} from 'next/headers';

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
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] ADMIN ONLY
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    // ----------------------------

    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');
        const productName = formData.get('name');
        const productDescription = formData.get('description');

        if (!imageFile) {
            return NextResponse.json({error: 'Không có tệp hình ảnh được cung cấp.'}, {status: 400});
        }

        // 1. Fetch Dynamic Attributes from Database
        // We only want root attributes (parents) that are active filters
        const {data: attributes, error: dbError} = await supabase
            .from('categories')
            .select('name')
            .eq('type', 'attribute')
            .is('parent_id', null) // Only get root groups (e.g. Color, Material)
            .eq('is_active', true);

        if (dbError) throw dbError;

        // Format attributes for the prompt (e.g., "- Color\n- Material")
        const attributeList = attributes && attributes.length > 0
            ? attributes.map(a => `- ${a.name}`).join('\n')
            : '- Category\n- Color\n- Style'; // Fallback if DB is empty

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const mimeType = imageFile.type;
        const imagePart = await fileToGenerativePart(buffer, mimeType);

        const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});

        // 2. Construct Dynamic Prompt
        const prompt = `Analyze this fashion item image, name, and description.
        Name: "${productName}"
        Description: "${productDescription}"

        Your task is to categorize this item according to the user's specific store attributes.
        
        Please extract values ONLY for the following Attribute Groups:
        ${attributeList}
        
        Guidelines:
        - Look for visual cues in the image and keywords in the text.
        - Return ONLY a valid JSON object.
        - The keys of the JSON object must match the Attribute Groups listed above EXACTLY.
        - The values should be arrays of strings (e.g. ["Navy", "Blue"]).
        - If a group is not applicable or cannot be determined, omit it from the JSON.
        - Do not include markdown formatting or code blocks.
        
        Example Output Format:
        {
          "${attributes?.[0]?.name || 'Color'}": ["Value1", "Value2"],
          "${attributes?.[1]?.name || 'Material'}": ["Value3"]
        }`;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean up result
        const cleanedText = text.replace(/```json|```/g, '').trim();
        const structuredTags = JSON.parse(cleanedText);

        return NextResponse.json({data: structuredTags});

    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }
}