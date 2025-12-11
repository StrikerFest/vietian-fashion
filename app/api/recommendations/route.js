// app/api/recommendations/route.js
import {NextResponse} from 'next/server';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {supabase} from '@/lib/supabaseClient';
import {generateEmbedding} from '@/utils/ai-server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
    try {
        const body = await request.json();
        const mode = body.mode || 'semantic';

        // 1. Parse Input Query
        let userQuery = "";
        let attributes = {};

        if (typeof body.query === 'string') {
            userQuery = body.query;
        } else {
            userQuery = body.generalPrompt || "";
            attributes = body.attributes || {};
        }

        if (!userQuery && Object.keys(attributes).length === 0) {
            return NextResponse.json({error: 'Query is required.'}, {status: 400});
        }

        // --- BRANCH A: KEYWORD SEARCH (Deterministic) ---
        if (mode === 'keyword') {
            const searchTerm = `%${userQuery}%`;

            const [collectionsRes, categoriesRes, productsRes] = await Promise.all([
                // 1. Search Collections
                supabase.from('collections')
                    .select('*')
                    .ilike('name', searchTerm)
                    .limit(5),

                // 2. Search Categories
                supabase.from('categories')
                    .select('*')
                    .ilike('name', searchTerm)
                    .limit(5),

                // 3. Search Products (Name or Description)
                supabase.from('products')
                    .select('*, product_variants(*, inventory_levels(*))')
                    .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                    .eq('status', 'active') // <--- SECURITY PATCH ADDED HERE
                    .is('deleted_at', null)
                    .limit(20)
            ]);

            return NextResponse.json({
                products: productsRes.data || [],
                collections: collectionsRes.data || [],
                attributes: categoriesRes.data || [],
                generatedTags: [userQuery]
            });
        }

        // --- BRANCH B: SEMANTIC SEARCH (AI / RAG) ---

        let searchContext = userQuery;
        if (Object.keys(attributes).length > 0) {
            const attrString = Object.entries(attributes)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
            searchContext += ` (${attrString})`;
        }

        const embedding = await generateEmbedding(searchContext);

        // Fetch Limits
        const {data: settingsData} = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'ai_search_limits')
            .single();

        const limits = settingsData?.value || {products: 8, collections: 2, attributes: 2};
        const candidatePoolSize = 20;

        // Vector Search
        const [collectionCandidates, categoryCandidates] = await Promise.all([
            supabase.rpc('match_collections', {
                query_embedding: embedding,
                match_threshold: 0.3,
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

        // Construct Prompt
        const collectionList = validCollections
            .map(c => `ID: ${c.id}, Name: "${c.name}"`)
            .join('\n');

        const attributeList = validAttributes
            .map(a => `ID: ${a.id}, Name: "${a.name}" (Group: ${a.parent_name || 'Root'})`)
            .join('\n');

        const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});

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
            - "searchTags": Return lowercase ENGLISH keywords describing the item (style, material, occasion).
            - "collectionIds": Select ONLY the IDs from the list above that truly match.
            - "attributeIds": Select ONLY the IDs from the list above that truly match.
            
            Return ONLY valid JSON:
            {
              "searchTags": ["tag1", "tag2"],
              "collectionIds": [1],
              "attributeIds": [10, 12]
            }
        `;

        const result = await model.generateContent(systemInstruction);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const cleanedText = jsonMatch ? jsonMatch[0] : text;

        let aiResponse = {searchTags: [userQuery], collectionIds: [], attributeIds: []};

        try {
            const parsed = JSON.parse(cleanedText);
            if (parsed.searchTags) aiResponse.searchTags = parsed.searchTags;
            if (parsed.collectionIds) aiResponse.collectionIds = parsed.collectionIds;
            if (parsed.attributeIds) aiResponse.attributeIds = parsed.attributeIds;
        } catch (e) {
            console.error("AI Parse Error:", e);
        }

        const {searchTags, collectionIds, attributeIds} = aiResponse;

        // Fetch Final Data
        const {data: products} = await supabase
            .rpc('search_products_by_tags', {tag_names: searchTags || []})
            .select('*, product_variants(*, inventory_levels(*))')
            .limit(limits.products);

        let matchedCollections = [];
        if (collectionIds && collectionIds.length > 0) {
            const {data} = await supabase.from('collections').select('*').in('id', collectionIds).limit(limits.collections);
            matchedCollections = data || [];
        }

        let matchedAttributes = [];
        if (attributeIds && attributeIds.length > 0) {
            const {data} = await supabase.from('categories').select('*').in('id', attributeIds).limit(limits.attributes);
            matchedAttributes = data || [];
        }

        return NextResponse.json({
            products: products || [],
            collections: matchedCollections,
            attributes: matchedAttributes,
            generatedTags: searchTags
        });

    } catch (error) {
        console.error('Recommendation API error:', error);
        return NextResponse.json({error: 'Failed to get recommendations.'}, {status: 500});
    }
}