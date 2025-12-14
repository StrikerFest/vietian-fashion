// app/api/recommendations/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';
import { generateEmbedding } from '@/utils/ai-server';

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
            return NextResponse.json({ error: 'Yêu cầu truy vấn.' }, { status: 400 });
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
                    .eq('status', 'active')
                    .is('deleted_at', null)
                    .limit(20)
            ]);

            const maskedProducts = (productsRes.data || []).map(p => ({
                ...p,
                product_variants: p.product_variants.map(v => {
                    const realStock = v.inventory_levels?.[0]?.on_hand || 0;
                    const { inventory_levels, ...safeVariant } = v;
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

        // Fetch Limits (with Safe Defaults)
        const { data: settingsData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'ai_search_limits')
            .single();

        const limits = {
            products: 8,
            collections: 4, // Tăng nhẹ để hiển thị nhiều hơn
            attributes: 4,
            ...(settingsData?.value || {})
        };

        const candidatePoolSize = 30; // Tăng pool size

        // Vector Search
        // [FIX] Hạ match_threshold xuống 0.15 để thu thập nhiều ứng viên tiềm năng hơn cho AI chọn lọc
        const [collectionCandidates, categoryCandidates] = await Promise.all([
            supabase.rpc('match_collections', {
                query_embedding: embedding,
                match_threshold: 0.15,
                match_count: candidatePoolSize
            }),
            supabase.rpc('match_categories', {
                query_embedding: embedding,
                match_threshold: 0.15,
                match_count: candidatePoolSize
            })
        ]);

        const validCollections = collectionCandidates.data || [];
        const validAttributes = categoryCandidates.data || [];

        const collectionList = validCollections
            .map(c => `ID: ${c.id}, Name: "${c.name}"`)
            .join('\n');

        const attributeList = validAttributes
            .map(a => `ID: ${a.id}, Name: "${a.name}" (Group: ${a.parent_name || 'Root'})`)
            .join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // [FIX] Prompt Bilingual + Hướng dẫn chọn Collection/Attribute linh hoạt hơn
        const systemInstruction = `
            You are a smart, bilingual fashion shopping assistant (Vietnamese & English).

            User Query: "${userQuery}"

            Your Goal: 
            1. **Analyze Intent**: Understand the user's need (style, occasion, weather).
            2. **Generate Tags**: Create a list of 10-15 keywords. **Mix BOTH Vietnamese and English**.
            3. **Select IDs**: Look at the Candidate Lists below. Select IDs of collections or attributes that are **semantically relevant** to the query. 
               - *Rule:* It doesn't have to be an exact keyword match. If the user asks for "winter", select "Jackets" or "Hoodies" categories.

            Candidate Collections:
            ${collectionList || "None found."}

            Candidate Attributes:
            ${attributeList || "None found."}
            
            Instructions:
            - "searchTags": Array of strings. Lowercase. Mix English and Vietnamese keywords.
            - "collectionIds": Array of matching IDs from the list above.
            - "attributeIds": Array of matching IDs from the list above.
            
            Return ONLY valid JSON:
            {
              "searchTags": ["winter", "mùa đông", "ấm áp", "jacket"],
              "collectionIds": [1, 5],
              "attributeIds": [10]
            }
        `;

        const result = await model.generateContent(systemInstruction);
        const text = result.response.text();
        const cleanedText = (text.match(/\{[\s\S]*\}/) || [text])[0];

        let aiResponse = { searchTags: [userQuery], collectionIds: [], attributeIds: [] };
        try {
            aiResponse = JSON.parse(cleanedText);
        } catch (e) {
            console.error("AI Parse Error", e);
        }

        const { searchTags, collectionIds, attributeIds } = aiResponse;

        // Fetch Final Data
        const { data: products } = await supabase
            .rpc('search_products_by_tags', { tag_names: searchTags || [] })
            .select('*, product_variants(*, inventory_levels(*))')
            .limit(limits.products);

        const maskedSemanticProducts = (products || []).map(p => ({
            ...p,
            product_variants: p.product_variants.map(v => {
                const realStock = v.inventory_levels?.[0]?.on_hand || 0;
                const { inventory_levels, ...safeVariant } = v;
                return {
                    ...safeVariant,
                    in_stock: realStock > 0,
                    low_stock: realStock > 0 && realStock <= 10,
                    stock_display: realStock > 10 ? 10 : realStock
                };
            })
        }));

        let matchedCollections = [];
        if (collectionIds && collectionIds.length > 0) {
            const { data } = await supabase.from('collections').select('*').in('id', collectionIds).limit(limits.collections);
            matchedCollections = data || [];
        }

        let matchedAttributes = [];
        if (attributeIds && attributeIds.length > 0) {
            const { data } = await supabase.from('categories').select('*').in('id', attributeIds).limit(limits.attributes);
            matchedAttributes = data || [];
        }

        return NextResponse.json({
            products: maskedSemanticProducts,
            collections: matchedCollections,
            attributes: matchedAttributes,
            generatedTags: searchTags
        });

    } catch (error) {
        console.error("Recommendation API Error:", error);
        return NextResponse.json({ error: 'Lấy đề xuất thất bại.' }, { status: 500 });
    }
}