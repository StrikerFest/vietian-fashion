// app/api/recommendations/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
    try {
        const body = await request.json();

        // 1. Parse Input
        let userQuery = "";
        let attributes = {};

        if (typeof body.query === 'string') {
            userQuery = body.query;
        } else {
            userQuery = body.generalPrompt || "";
            attributes = body.attributes || {};
        }

        if (!userQuery && Object.keys(attributes).length === 0) {
            return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
        }

        // 2. Fetch Limits & Store Map (Parallel)
        const [settingsRes, collectionsRes, attributesRes] = await Promise.all([
            supabase.from('settings').select('value').eq('key', 'ai_search_limits').single(),
            supabase.from('collections').select('id, name').is('deleted_at', null),
            supabase.from('categories').select('id, name, parent:parent_id(name)').eq('type', 'attribute').eq('is_active', true).not('parent_id', 'is', null).is('deleted_at', null)
        ]);

        // Apply Defaults if settings missing
        const limits = settingsRes.data?.value || { products: 8, collections: 1, attributes: 1 };
        const validCollections = collectionsRes.data || [];
        const validAttributes = attributesRes.data || [];

        // 3. Construct Prompt
        let promptContext = `User Search: "${userQuery}".\n`;
        if (Object.keys(attributes).length > 0) {
            promptContext += "Specific Constraints:\n";
            for (const [key, value] of Object.entries(attributes)) {
                if (value) promptContext += `- ${key}: ${value}\n`;
            }
        }

        const collectionList = validCollections.map(c => `ID: ${c.id}, Name: "${c.name}"`).join('\n');
        const attributeList = validAttributes.map(a => `ID: ${a.id}, Name: "${a.name}" (Group: ${a.parent?.name})`).join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Updated instructions to request ARRAYS based on limits
        const systemInstruction = `
            You are a smart fashion shopping assistant. 
            
            Your Goal: 
            1. Analyze the user's search intent.
            2. Generate generic search tags.
            3. Identify the TOP ${limits.collections} most relevant Collection IDs.
            4. Identify the TOP ${limits.attributes} most relevant Attribute IDs.

            Available Collections:
            ${collectionList}

            Available Attributes:
            ${attributeList}
            
            Instructions:
            - "searchTags": Return 5-10 lowercase keywords.
            - "collectionIds": Return an array of the top ${limits.collections} relevant Collection IDs (integers). Empty array if none.
            - "attributeIds": Return an array of the top ${limits.attributes} relevant Attribute IDs (integers). Empty array if none.
            
            Return ONLY valid JSON:
            {
              "searchTags": ["tag1", "tag2"],
              "collectionIds": [1, 2],
              "attributeIds": [10, 12]
            }
        `;

        // 4. Execute AI
        const result = await model.generateContent([systemInstruction, promptContext]);
        const response = await result.response;
        const cleanedText = response.text().replace(/```json|```/g, '').trim();

        let aiResponse = { searchTags: [userQuery], collectionIds: [], attributeIds: [] };
        try {
            aiResponse = JSON.parse(cleanedText);
        } catch (e) {
            console.error("AI Parse Error:", e);
        }

        const { searchTags, collectionIds, attributeIds } = aiResponse;

        // 5. Fetch Result Data
        // A. Products (Limit applied here)
        const { data: products, error: productError } = await supabase
            .rpc('search_products_by_tags', { tag_names: searchTags || [] })
            .select('*, product_variants(*, inventory_levels(*))')
            .limit(limits.products); // <--- Apply Product Limit

        if (productError) throw productError;

        // B. Fetch Matched Collections (Multiple)
        let matchedCollections = [];
        if (collectionIds && collectionIds.length > 0) {
            const { data } = await supabase
                .from('collections')
                .select('*')
                .in('id', collectionIds)
                .limit(limits.collections);
            matchedCollections = data || [];
        }

        // C. Fetch Matched Attributes (Multiple)
        let matchedAttributes = [];
        if (attributeIds && attributeIds.length > 0) {
            const { data } = await supabase
                .from('categories')
                .select('*')
                .in('id', attributeIds)
                .limit(limits.attributes);
            matchedAttributes = data || [];
        }

        // 6. Return Response
        return NextResponse.json({
            products,
            collections: matchedCollections, // Now an array
            attributes: matchedAttributes,   // Now an array
            generatedTags: searchTags
        });

    } catch (error) {
        console.error('Recommendation API error:', error);
        return NextResponse.json({ error: 'Failed to get recommendations.', details: error.message }, { status: 500 });
    }
}