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

        let userQuery = "";
        let attributes = {};

        if (typeof body.query === 'string') {
            userQuery = body.query;
        } else {
            userQuery = body.generalPrompt || "";
            attributes = body.attributes || {};
        }

        if (!userQuery && Object.keys(attributes).length === 0) {
            return NextResponse.json({error: 'Yêu cầu truy vấn.'}, {status: 400});
        }

        // --- BRANCH A: KEYWORD SEARCH ---
        if (mode === 'keyword') {
            const searchTerm = `%${userQuery}%`;

            const [collectionsRes, categoriesRes, productsRes] = await Promise.all([
                supabase.from('collections').select('*').ilike('name', searchTerm).limit(5),
                supabase.from('categories').select('*').ilike('name', searchTerm).limit(5),
                supabase.from('products')
                    .select('*, product_variants(*, inventory_levels(*))')
                    .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                    .eq('status', 'active') // [SECURITY] Hide Drafts
                    .is('deleted_at', null)
                    .limit(20)
            ]);

            // [SECURITY] MASK INVENTORY FOR KEYWORD SEARCH
            const maskedProducts = (productsRes.data || []).map(p => ({
                ...p,
                product_variants: p.product_variants.map(v => {
                    const realStock = v.inventory_levels?.[0]?.on_hand || 0;
                    const {inventory_levels, ...safeVariant} = v;
                    return {
                        ...safeVariant,
                        in_stock: realStock > 0,
                        low_stock: realStock > 0 && realStock <= 10,
                        stock_display: realStock > 10 ? 10 : realStock
                    };
                })
            }));

            return NextResponse.json({
                products: maskedProducts,
                collections: collectionsRes.data || [],
                attributes: categoriesRes.data || [],
                generatedTags: [userQuery]
            });
        }

        // --- BRANCH B: SEMANTIC SEARCH ---

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

        // ... (Prompt Construction & AI Generation Code - SAME AS BEFORE) ...
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
        const cleanedText = (text.match(/\{[\s\S]*\}/) || [text])[0];

        let aiResponse = {searchTags: [userQuery], collectionIds: [], attributeIds: []};
        try {
            aiResponse = JSON.parse(cleanedText);
        } catch (e) {
            console.error(e);
        }

        const {searchTags, collectionIds, attributeIds} = aiResponse;

        // Fetch Final Data (Using the SQL function which we patched to filter Active products)
        const {data: products} = await supabase
            .rpc('search_products_by_tags', {tag_names: searchTags || []})
            .select('*, product_variants(*, inventory_levels(*))')
            .limit(limits.products);

        // [SECURITY] MASK INVENTORY FOR SEMANTIC SEARCH
        const maskedSemanticProducts = (products || []).map(p => ({
            ...p,
            product_variants: p.product_variants.map(v => {
                const realStock = v.inventory_levels?.[0]?.on_hand || 0;
                const {inventory_levels, ...safeVariant} = v;
                return {
                    ...safeVariant,
                    in_stock: realStock > 0,
                    low_stock: realStock > 0 && realStock <= 10,
                    stock_display: realStock > 10 ? 10 : realStock
                };
            })
        }));

        let matchedCollections = [];
        if (collectionIds?.length) {
            const {data} = await supabase.from('collections').select('*').in('id', collectionIds).limit(limits.collections);
            matchedCollections = data || [];
        }

        let matchedAttributes = [];
        if (attributeIds?.length) {
            const {data} = await supabase.from('categories').select('*').in('id', attributeIds).limit(limits.attributes);
            matchedAttributes = data || [];
        }

        return NextResponse.json({
            products: maskedSemanticProducts, // Return masked data
            collections: matchedCollections,
            attributes: matchedAttributes,
            generatedTags: searchTags
        });

    } catch (error) {
        return NextResponse.json({error: 'Lấy đề xuất thất bại.'}, {status: 500});
    }
}