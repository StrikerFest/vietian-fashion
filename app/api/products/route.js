// app/api/products/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    // --- AUTH & SCOPE SETUP ---
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const scope = searchParams.get('scope'); // 'admin' or null

    // 1. Determine Status Filter
    let statusFilter = ['active'];
    let isAdmin = false;

    if (scope === 'admin') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            statusFilter = ['active', 'draft', 'archived'];
            isAdmin = true;
        }
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'created_at-desc';
    const collectionId = searchParams.get('collection_id');
    const categoryId = searchParams.get('category_id');
    const type = searchParams.get('type'); // [FIX] New parameter 'ai' or 'standard'

    // Filter Params
    const reservedParams = ['page', 'limit', 'search', 'sort', 'collection_id', 'category_id', 'scope', 'type'];
    const attributeFilters = {};
    searchParams.forEach((value, key) => {
        if (!reservedParams.includes(key)) {
            if (!attributeFilters[key]) attributeFilters[key] = [];
            attributeFilters[key].push(value);
        }
    });

    try {
        // --- STEP 1: Get Base Product IDs (Before Attribute Filters) ---
        let baseQuery = supabase
            .from('products')
            .select('id')
            .is('deleted_at', null)
            .in('status', statusFilter);

        if (search) baseQuery = baseQuery.ilike('name', `%${search}%`);

        // [FIX] Apply AI Filter logic on Server Side
        if (type === 'ai') {
            baseQuery = baseQuery.ilike('name', '[AI]%');
        } else if (type === 'standard') {
            baseQuery = baseQuery.not('name', 'ilike', '[AI]%');
        }

        if (collectionId) {
            const { data: linked } = await supabase.from('product_collections').select('product_id').eq('collection_id', collectionId);
            baseQuery = baseQuery.in('id', linked?.map(p => p.product_id) || []);
        }

        if (categoryId) {
            const { data: linked } = await supabase.from('product_categories').select('product_id').eq('category_id', categoryId);
            baseQuery = baseQuery.in('id', linked?.map(p => p.product_id) || []);
        }

        const { data: baseProducts, error: baseError } = await baseQuery;
        if (baseError) throw baseError;

        const baseProductIds = baseProducts.map(p => p.id);

        if (baseProductIds.length === 0) {
            return NextResponse.json({ data: [], meta: { total: 0 }, facets: {} });
        }

        // --- STEP 2: Calculate Facets (Counts) ---
        const { data: allVariants } = await supabase
            .from('product_variants')
            .select(`
                product_id,
                variant_attributes!inner (
                    attribute_value:categories!inner (
                        slug
                    )
                )
            `)
            .in('product_id', baseProductIds);

        const facetCounts = {};
        if (allVariants) {
            allVariants.forEach(v => {
                v.variant_attributes?.forEach(va => {
                    const attrSlug = va.attribute_value?.slug;
                    if (attrSlug) {
                        if (!facetCounts[attrSlug]) facetCounts[attrSlug] = new Set();
                        facetCounts[attrSlug].add(v.product_id); // Count unique products
                    }
                });
            });
        }

        const facets = {};
        Object.keys(facetCounts).forEach(key => {
            facets[key] = facetCounts[key].size;
        });

        // --- STEP 3: Apply Attribute Filters ---
        let finalProductIds = baseProductIds;

        if (Object.keys(attributeFilters).length > 0) {
            for (const [key, values] of Object.entries(attributeFilters)) {
                const { data: matchingVariants } = await supabase
                    .from('variant_attributes')
                    .select('variant_id, attribute_value:categories!inner(slug)')
                    .in('attribute_value.slug', values);

                if (matchingVariants && matchingVariants.length > 0) {
                    const variantIds = matchingVariants.map(v => v.variant_id);
                    const { data: pIds } = await supabase.from('product_variants').select('product_id').in('id', variantIds);
                    const validPIds = new Set(pIds.map(p => p.product_id));
                    finalProductIds = finalProductIds.filter(id => validPIds.has(id));
                } else {
                    finalProductIds = [];
                }
            }
        }

        if (finalProductIds.length === 0) {
            return NextResponse.json({ data: [], meta: { total: 0 }, facets });
        }

        // --- STEP 4: Fetch Final Data & Pagination ---
        let query = supabase
            .from('products')
            .select(`
                *, 
                collections (*), 
                product_categories (categories (id, name, slug, type)),
                product_variants (
                    *,
                    inventory_levels (*),
                    variant_attributes (
                        attribute_value:categories (
                            id, name, parent_id, 
                            parent:parent_id ( name )
                        )
                    )
                )
            `, { count: 'exact' })
            .in('id', finalProductIds);

        // Sorting
        switch (sort) {
            case 'position-desc': query = query.order('position', { ascending: false }); break;
            case 'name-asc': query = query.order('name', { ascending: true }); break;
            case 'name-desc': query = query.order('name', { ascending: false }); break;
            case 'price-asc': query = query.order('name', { ascending: true }); break;
            default: query = query.order('created_at', { ascending: false });
        }

        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        // Data Formatting
        const formattedData = data.map(product => ({
            ...product,
            catalog_categories: product.product_categories?.map(pc => pc.categories).filter(c => c.type === 'catalog') || [],
            attributes: product.product_categories?.map(pc => pc.categories).filter(c => c.type === 'attribute') || [],

            product_variants: product.product_variants.map(v => {
                const attributes = {};
                const attribute_value_ids = [];
                
                // DEBUG: Inspect inventory data
                // console.log(`Variant ${v.id} Inventory:`, v.inventory_levels);

                v.variant_attributes?.forEach(va => {
                    if (va.attribute_value) {
                        attribute_value_ids.push(va.attribute_value.id);
                        if (va.attribute_value.parent?.name) {
                            attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                        }
                    }
                });

                // [FIX] Robust Inventory Handling
                let stockData = v.inventory_levels;
                if (Array.isArray(stockData)) {
                    stockData = stockData[0];
                }
                
                // Parse Int to ensure BigInt strings are handled
                const realStock = parseInt(stockData?.on_hand || 0); 
                
                const { inventory_levels, ...safeVariant } = v;

                if (isAdmin) {
                    return {
                        ...v,
                        attributes,
                        attribute_value_ids,
                        inventory_levels: v.inventory_levels,
                        on_hand: realStock
                    };
                }

                return {
                    ...safeVariant,
                    attributes,
                    attribute_value_ids,
                    in_stock: realStock > 0,
                    low_stock: realStock > 0 && realStock <= 10,
                    stock_display: realStock > 10 ? 10 : realStock
                };
            }),
            product_categories: undefined
        }));

        // Manual Sort for Price
        if (sort === 'price-asc' || sort === 'price-desc') {
            formattedData.sort((a, b) => {
                const pA = a.product_variants?.[0]?.price || 0;
                const pB = b.product_variants?.[0]?.price || 0;
                return sort === 'price-asc' ? pA - pB : pB - pA;
            });
        }

        return NextResponse.json({
            data: formattedData,
            meta: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) },
            facets
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY] Check for Admin Session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const {
        name, description, image_url, images = [], seo_title, seo_description, variants,
        attribute_ids = [], category_id, collection_ids = [], position = 0, status
    } = await request.json();

    try {
        // Construct Payload for RPC
        const payload = {
            name,
            description,
            status,
            image_url, // Legacy Main Image
            seo_title,
            seo_description,
            position,
            images, // Array of { image_url, is_primary, alt_text }
            variants: variants.map(v => ({
                sku: v.sku,
                price: v.price,
                on_hand: v.on_hand,
                attribute_value_ids: v.attribute_value_ids // Array of IDs
            })),
            collection_ids,
            category_id,
            attribute_ids
        };

        // Call Atomic RPC
        const { data: product, error } = await supabase.rpc('create_product_full', { payload });

        if (error) throw error;

        return NextResponse.json(product);

    } catch (error) {
        console.error('Create Product Error:', error);
        return NextResponse.json({ error: error.message || 'Tạo sản phẩm thất bại.' }, { status: 500 });
    }
}