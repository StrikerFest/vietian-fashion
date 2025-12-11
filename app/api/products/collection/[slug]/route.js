// app/api/products/collection/[slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    if (!slug) return NextResponse.json({ error: 'Collection required' }, { status: 400 });

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
        if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

        const { data: links } = await supabase.from('product_collections').select('product_id').eq('collection_id', collection.id);
        let productIds = links?.map(l => l.product_id) || [];

        if (productIds.length === 0) return NextResponse.json({ collection, data: [], meta: { total: 0 } });

        // Apply Filters
        if (Object.keys(attributeFilters).length > 0) {
            for (const [key, values] of Object.entries(attributeFilters)) {
                const { data: matchingVariants } = await supabase
                    .from('variant_attributes')
                    .select('variant_id, attribute_value:categories!inner(name)')
                    .in('attribute_value.name', values);

                if (matchingVariants && matchingVariants.length > 0) {
                    const varIds = matchingVariants.map(v => v.variant_id);
                    const { data: pIds } = await supabase.from('product_variants').select('product_id').in('id', varIds);
                    const validPIds = new Set(pIds.map(p => p.product_id));
                    productIds = productIds.filter(id => validPIds.has(id));
                } else {
                    productIds = [];
                }
            }
        }

        if (productIds.length === 0) return NextResponse.json({ collection, data: [], meta: { total: 0 } });

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
            .in('id', productIds)
            .eq('status', 'active') // <--- SECURITY PATCH ADDED HERE
            .is('deleted_at', null);

        if (sortBy === 'name-asc') productQuery = productQuery.order('name', { ascending: true });
        else productQuery = productQuery.order('position', { ascending: false });

        const start = (page - 1) * limit;
        productQuery = productQuery.range(start, start + limit - 1);

        const { data: products, error, count } = await productQuery;
        if (error) throw error;

        const formattedData = products.map(p => ({
            ...p,
            product_variants: p.product_variants.map(v => {
                const attributes = {};
                v.variant_attributes?.forEach(va => {
                    if (va.attribute_value?.parent?.name) attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                });
                return { ...v, attributes };
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
            meta: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}