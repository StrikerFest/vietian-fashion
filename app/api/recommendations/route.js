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
        const text = response.text();

        // --- FIX: Robust JSON Extraction ---
        // Find the first '{' and the last '}' to ignore conversational fluff
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const cleanedText = jsonMatch ? jsonMatch[0] : text;

        let aiResponse = { searchTags: [userQuery], collectionIds: [], attributeIds: [] };

        try {
            const parsed = JSON.parse(cleanedText);

            // Validate Structure (Prevent crashes if AI returns null or wrong types)
            if (parsed.searchTags && Array.isArray(parsed.searchTags)) {
                aiResponse.searchTags = parsed.searchTags;
            }
            if (parsed.collectionIds && Array.isArray(parsed.collectionIds)) {
                aiResponse.collectionIds = parsed.collectionIds;
            }
            if (parsed.attributeIds && Array.isArray(parsed.attributeIds)) {
                aiResponse.attributeIds = parsed.attributeIds;
            }
        } catch (e) {
            console.error("AI Parse Error (Falling back to keyword):", e);
            // Fallback is already set to basic keyword search
        }

        const { searchTags, collectionIds, attributeIds } = aiResponse;

        // 5. Fetch Result Data
        // A. Products
        const { data: products, error: productError } = await supabase
            .rpc('search_products_by_tags', { tag_names: searchTags || [] })
            .select('*, product_variants(*, inventory_levels(*))')
            .limit(limits.products);

        if (productError) throw productError;

        // B. Fetch Matched Collections
        let matchedCollections = [];
        if (collectionIds && collectionIds.length > 0) {
            const { data } = await supabase
                .from('collections')
                .select('*')
                .in('id', collectionIds)
                .limit(limits.collections);
            matchedCollections = data || [];
        }

        // C. Fetch Matched Attributes
        let matchedAttributes = [];
        if (attributeIds && attributeIds.length > 0) {
            const { data } = await supabase
                .from('categories')
                .select('*')
                .in('id', attributeIds)
                .limit(limits.attributes);
            matchedAttributes = data || [];
        }

        return NextResponse.json({
            products,
            collections: matchedCollections,
            attributes: matchedAttributes,
            generatedTags: searchTags
        });

    } catch (error) {
        console.error('Recommendation API error:', error);
        return NextResponse.json({ error: 'Failed to get recommendations.', details: error.message }, { status: 500 });
    }
}