// app/api/products/category/[...slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    if (!slug || slug.length === 0) return NextResponse.json({ error: 'Category required' }, { status: 400 });
    const categorySlug = slug[slug.length - 1];

    const sortBy = searchParams.get('sort');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    // Dynamic Filters
    const reservedParams = ['sort', 'page', 'limit', 'slug'];
    const attributeFilters = {};
    searchParams.forEach((value, key) => {
        if (!reservedParams.includes(key)) {
            if (!attributeFilters[key]) attributeFilters[key] = [];
            attributeFilters[key].push(value);
        }
    });

    try {
        // 1. Get Category
        const { data: category } = await supabase.from('categories').select('*').eq('slug', categorySlug).single();
        if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

        // 2. Find Linked Products (SMART LOOKUP)
        let productIds = [];

        if (category.type === 'attribute') {
            // If browsing an Attribute (e.g. "Red"), look in variant_attributes
            const { data: variantLinks } = await supabase
                .from('variant_attributes')
                .select('variant_id')
                .eq('attribute_value_id', category.id);

            const variantIds = variantLinks?.map(l => l.variant_id) || [];
            if (variantIds.length > 0) {
                const { data: pIds } = await supabase
                    .from('product_variants')
                    .select('product_id')
                    .in('id', variantIds);
                productIds = pIds?.map(p => p.product_id) || [];
            }
        } else {
            // If browsing a Catalog (e.g. "Men"), look in product_categories
            const { data: catLinks } = await supabase
                .from('product_categories')
                .select('product_id')
                .eq('category_id', category.id);
            productIds = catLinks?.map(l => l.product_id) || [];
        }

        // Dedupe IDs
        productIds = [...new Set(productIds)];

        if (productIds.length === 0) return NextResponse.json({ category, data: [], meta: { total: 0 } });

        // 3. Apply Sidebar Filters (Same as before)
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

        if (productIds.length === 0) return NextResponse.json({ category, data: [], meta: { total: 0 } });

        // 4. Fetch Products
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

        // Price Sort
        if (sortBy?.startsWith('price')) {
            const asc = sortBy === 'price-asc';
            formattedData.sort((a, b) => {
                const pA = a.product_variants[0]?.price || 0;
                const pB = b.product_variants[0]?.price || 0;
                return asc ? pA - pB : pB - pA;
            });
        }

        return NextResponse.json({
            category,
            data: formattedData,
            meta: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}