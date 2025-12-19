// app/api/products/collection/[slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    if (!slug) return NextResponse.json({ error: 'Yêu cầu bộ sưu tập' }, { status: 400 });

    const sortBy = searchParams.get('sort');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    const reservedParams = ['sort', 'page', 'limit', 'slug'];
    const attributeFilters = {};
    searchParams.forEach((value, key) => {
        if (!reservedParams.includes(key)) {
            if (!attributeFilters[key]) attributeFilters[key] = [];
            attributeFilters[key].push(value);
        }
    });

    try {
        const { data: collection } = await supabase.from('collections').select('*').eq('slug', slug).single();
        if (!collection) return NextResponse.json({ error: 'Không tìm thấy bộ sưu tập' }, { status: 404 });

        const { data: links } = await supabase.from('product_collections').select('product_id').eq('collection_id', collection.id);
        let baseProductIds = links?.map(l => l.product_id) || [];

        if (baseProductIds.length === 0) return NextResponse.json({ collection, data: [], meta: { total: 0 }, facets: {} });

        // --- NEW: Calculate Facets (Counts) ---
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
                        facetCounts[attrSlug].add(v.product_id);
                    }
                });
            });
        }

        const facets = {};
        Object.keys(facetCounts).forEach(key => {
            facets[key] = facetCounts[key].size;
        });

        // Apply Filters
        let filteredProductIds = baseProductIds;

        if (Object.keys(attributeFilters).length > 0) {
            for (const [key, values] of Object.entries(attributeFilters)) {
                // [FIX] Use slug
                const { data: matchingVariants } = await supabase
                    .from('variant_attributes')
                    .select('variant_id, attribute_value:categories!inner(slug)')
                    .in('attribute_value.slug', values);

                if (matchingVariants && matchingVariants.length > 0) {
                    const varIds = matchingVariants.map(v => v.variant_id);
                    const { data: pIds } = await supabase.from('product_variants').select('product_id').in('id', varIds);
                    const validPIds = new Set(pIds.map(p => p.product_id));
                    filteredProductIds = filteredProductIds.filter(id => validPIds.has(id));
                } else {
                    filteredProductIds = [];
                }
            }
        }

        if (filteredProductIds.length === 0) return NextResponse.json({ collection, data: [], meta: { total: 0 }, facets });

        let productQuery = supabase
            .from('products')
            .select(`
                *,
                product_variants (
                    *,
                    inventory_levels (on_hand),
                    variant_attributes (
                        attribute_value:categories (name, parent:parent_id(name))
                    )
                )
            `, { count: 'exact' })
            .in('id', filteredProductIds)
            .eq('status', 'active')
            .is('deleted_at', null);

        if (sortBy === 'name-asc') productQuery = productQuery.order('name', { ascending: true });
        else productQuery = productQuery.order('position', { ascending: false });

        const start = (page - 1) * limit;
        productQuery = productQuery.range(start, start + limit - 1);

        const { data: products, error, count } = await productQuery;
        if (error) throw error;

        // --- DATA TRANSFORMATION ---
        const formattedData = products.map(p => ({
            ...p,
            product_variants: p.product_variants.map(v => {
                const attributes = {};
                v.variant_attributes?.forEach(va => {
                    if (va.attribute_value?.parent?.name) attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                });
                const realStock = v.inventory_levels?.[0]?.on_hand || 0;
                const { inventory_levels, ...safeVariant } = v;

                return {
                    ...safeVariant,
                    attributes,
                    in_stock: realStock > 0,
                    low_stock: realStock > 0 && realStock <= 10,
                    stock_display: realStock > 10 ? 10 : realStock
                };
            })
        }));

        if (sortBy?.startsWith('price')) {
            const asc = sortBy === 'price-asc';
            formattedData.sort((a, b) => {
                const pA = a.product_variants[0]?.price || 0;
                const pB = b.product_variants[0]?.price || 0;
                return asc ? pA - pB : pB - pA;
            });
        }

        return NextResponse.json({
            collection,
            data: formattedData,
            meta: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
            facets // Return counts
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}