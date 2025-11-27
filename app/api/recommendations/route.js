// app/api/recommendations/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';
import { generateEmbedding } from '@/utils/ai-server'; // New import

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

        // Combine explicit attributes into the query for vector search context
        // e.g. Query: "Wedding dress", Attributes: { Color: "Red" } -> "Wedding dress Color: Red"
        let searchContext = userQuery;
        if (Object.keys(attributes).length > 0) {
            const attrString = Object.entries(attributes)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
            searchContext += ` (${attrString})`;
        }

        // 2. Generate Embedding for the Query (RAG Step 1)
        const embedding = await generateEmbedding(searchContext);

        // 3. Semantic Search (RAG Step 2)
        // Fetch Limits from settings first
        const { data: settingsData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'ai_search_limits')
            .single();

        const limits = settingsData?.value || { products: 8, collections: 2, attributes: 2 };

        // We fetch slightly more candidates (top 20) to let the LLM have options to choose from
        const candidatePoolSize = 20;

        // Parallel Vector Search
        const [collectionCandidates, categoryCandidates] = await Promise.all([
            supabase.rpc('match_collections', {
                query_embedding: embedding,
                match_threshold: 0.3, // Filter out complete noise
                match_count: candidatePoolSize
            }),
            supabase.rpc('match_categories', {
                query_embedding: embedding,
                match_threshold: 0.3,
                match_count: candidatePoolSize
            })
        ]);

        const validCollections = collectionCandidates.data || [];
        const validAttributes = categoryCandidates.data || [];

        // 4. Construct Prompt with Filtered Context (RAG Step 3)
        // Now we only send ~40 tokens instead of the entire database
        const collectionList = validCollections
            .map(c => `ID: ${c.id}, Name: "${c.name}"`)
            .join('\n');

        const attributeList = validAttributes
            .map(a => `ID: ${a.id}, Name: "${a.name}" (Group: ${a.parent_name || 'Root'})`)
            .join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemInstruction = `
            You are a smart fashion shopping assistant. 
            
            Your Goal: 
            1. Analyze the user's search intent: "${userQuery}"
            2. Generate 5-10 generic search tags (keywords) for database text matching.
            3. Select the best matching IDs from the provided candidate lists below.

            Candidate Collections (Top matches from vector search):
            ${collectionList || "None found."}

            Candidate Attributes (Top matches from vector search):
            ${attributeList || "None found."}
            
            Instructions:
            - "searchTags": Return lowercase keywords describing the item (style, material, occasion).
            - "collectionIds": Select ONLY the IDs from the list above that truly match.
            - "attributeIds": Select ONLY the IDs from the list above that truly match.
            
            Return ONLY valid JSON:
            {
              "searchTags": ["tag1", "tag2"],
              "collectionIds": [1],
              "attributeIds": [10, 12]
            }
        `;

        // 5. Execute AI
        const result = await model.generateContent(systemInstruction);
        const response = await result.response;
        const text = response.text();

        // Robust JSON Extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const cleanedText = jsonMatch ? jsonMatch[0] : text;

        let aiResponse = { searchTags: [userQuery], collectionIds: [], attributeIds: [] };

        try {
            const parsed = JSON.parse(cleanedText);
            if (parsed.searchTags) aiResponse.searchTags = parsed.searchTags;
            if (parsed.collectionIds) aiResponse.collectionIds = parsed.collectionIds;
            if (parsed.attributeIds) aiResponse.attributeIds = parsed.attributeIds;
        } catch (e) {
            console.error("AI Parse Error:", e);
        }

        const { searchTags, collectionIds, attributeIds } = aiResponse;

        // 6. Fetch Final Result Data
        // A. Products (Still using text tags for now, hybrid search is best)
        const { data: products, error: productError } = await supabase
            .rpc('search_products_by_tags', { tag_names: searchTags || [] })
            .select('*, product_variants(*, inventory_levels(*))')
            .limit(limits.products);

        if (productError) throw productError;

        // B. Fetch Matched Collections (Full Data)
        let matchedCollections = [];
        if (collectionIds && collectionIds.length > 0) {
            const { data } = await supabase
                .from('collections')
                .select('*')
                .in('id', collectionIds)
                .limit(limits.collections);
            matchedCollections = data || [];
        }

        // C. Fetch Matched Attributes (Full Data)
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