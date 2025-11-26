// app/api/products/category/[...slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    if (!slug || slug.length === 0) {
        return NextResponse.json({ error: 'Category slug is required.' }, { status: 400 });
    }

    // The last slug segment is the actual category to fetch
    const categorySlug = slug[slug.length - 1];

    // Extract Params
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
        // 1. Get Category
        const { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('id, name, description, seo_title, seo_description')
            .eq('slug', categorySlug)
            .is('deleted_at', null)
            .single();

        if (categoryError || !category) {
            return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
        }

        // 2. Base Query: Get Products in this Category
        const { data: links } = await supabase
            .from('product_categories')
            .select('product_id')
            .eq('category_id', category.id);

        let productIds = links?.map(l => l.product_id) || [];

        if (productIds.length === 0) {
            return NextResponse.json({ category, data: [], meta: { total: 0 } });
        }

        // 3. Apply Dynamic Attribute Filters
        if (Object.keys(attributeFilters).length > 0) {
            for (const [key, values] of Object.entries(attributeFilters)) {
                if (key === 'size' || key === 'color') {
                    const { data: variantMatches } = await supabase
                        .from('product_variants')
                        .select('product_id')
                        .in(key, values);
                    const validIds = new Set(variantMatches?.map(v => v.product_id));
                    productIds = productIds.filter(id => validIds.has(id));
                } else {
                    const { data: attrMatches } = await supabase
                        .from('product_categories')
                        .select('product_id, categories!inner(slug)')
                        .in('categories.slug', values);
                    const validIds = new Set(attrMatches?.map(a => a.product_id));
                    productIds = productIds.filter(id => validIds.has(id));
                }
            }
        }

        if (productIds.length === 0) {
            return NextResponse.json({ category, data: [], meta: { total: 0 } });
        }

        // 4. Fetch Products
        let productQuery = supabase
            .from('products')
            .select(`
                id, name, description, position, created_at, image_url,
                product_variants (
                    id, sku, price, size, color,
                    inventory_levels ( on_hand, committed )
                )
            `, { count: 'exact' })
            .in('id', productIds)
            .is('deleted_at', null);

        // 5. Sorting
        if (sortBy) {
            const [field, direction] = sortBy.split('-');
            const ascending = direction === 'asc';
            if (field === 'name') {
                productQuery = productQuery.order('name', { ascending });
            }
        } else {
            productQuery = productQuery.order('position', { ascending: false });
        }

        // 6. Pagination
        const start = (page - 1) * limit;
        productQuery = productQuery.range(start, start + limit - 1);

        const { data: products, error: productsError, count } = await productQuery;

        if (productsError) throw productsError;

        // Price Sort
        let sortedProducts = products || [];
        if (sortBy?.startsWith('price')) {
            const ascending = sortBy.endsWith('asc');
            sortedProducts.sort((a, b) => {
                const priceA = a.product_variants[0]?.price || 0;
                const priceB = b.product_variants[0]?.price || 0;
                return ascending ? priceA - priceB : priceB - priceA;
            });
        }

        return NextResponse.json({
            category,
            data: sortedProducts,
            meta: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching category products:', error);
        return NextResponse.json({ error: 'Failed to fetch products.', details: error.message }, { status: 500 });
    }
}