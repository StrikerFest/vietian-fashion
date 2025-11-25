// app/api/recommendations/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
    try {
        const body = await request.json();

        // 1. Parse User Input
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

        // Fetch "Map" of the Store
        const [collectionsRes, attributesRes] = await Promise.all([
            supabase.from('collections').select('id, name, slug, description').is('deleted_at', null),
            supabase.from('categories').select('id, name, slug, parent:parent_id(name)').eq('type', 'attribute').eq('is_active', true).not('parent_id', 'is', null).is('deleted_at', null)
        ]);

        const validCollections = collectionsRes.data || [];
        const validAttributes = attributesRes.data || [];

        // AI Execution (Same prompt as before)
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
            Your Goal: Analyze user intent and return JSON.
            Available Collections:
            ${collectionList}
            Available Attributes:
            ${attributeList}
            Instructions:
            - "searchTags": Return 5-10 lowercase keywords.
            - "matchedCollectionId": Integer ID or null.
            - "matchedAttributeId": Integer ID or null.
            JSON Format: { "searchTags": [], "matchedCollectionId": null, "matchedAttributeId": null }
        `;

        const result = await model.generateContent([systemInstruction, promptContext]);
        const response = await result.response;
        const cleanedText = response.text().replace(/```json|```/g, '').trim();
        let aiResponse = {};
        try { aiResponse = JSON.parse(cleanedText); } catch (e) { aiResponse = { searchTags: [userQuery] }; }

        const { searchTags, matchedCollectionId, matchedAttributeId } = aiResponse;

        // --- CRITICAL FIX HERE: Chain .select() to fetch variants ---
        const { data: products, error: productError } = await supabase
            .rpc('search_products_by_tags', {
                tag_names: searchTags || []
            })
            .select('*, product_variants(*, inventory_levels(*))'); // <--- This ensures cards show price/image

        if (productError) throw productError;

        // Resolve Matches
        let matchedCollection = matchedCollectionId ? validCollections.find(c => c.id === matchedCollectionId) : null;
        let matchedAttribute = matchedAttributeId ? validAttributes.find(a => a.id === matchedAttributeId) : null;

        return NextResponse.json({
            products,
            collection: matchedCollection,
            attribute: matchedAttribute,
            generatedTags: searchTags
        });

    } catch (error) {
        console.error('Recommendation API error:', error);
        return NextResponse.json({ error: 'Failed to get recommendations.', details: error.message }, { status: 500 });
    }
}