// app/api/products/collection/[slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    if (!slug) {
        return NextResponse.json({ error: 'Collection slug is required.' }, { status: 400 });
    }

    // Extract known params
    const sortBy = searchParams.get('sort');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12'); // Default limit

    // Identify Attribute Filters
    // We collect any param that isn't reserved
    const reservedParams = ['sort', 'page', 'limit', 'slug'];
    const attributeFilters = {};

    searchParams.forEach((value, key) => {
        if (!reservedParams.includes(key)) {
            if (!attributeFilters[key]) attributeFilters[key] = [];
            attributeFilters[key].push(value);
        }
    });

    try {
        // 1. Get Collection
        const { data: collection, error: collectionError } = await supabase
            .from('collections')
            .select('id, name, description, seo_title, seo_description')
            .eq('slug', slug)
            .is('deleted_at', null)
            .single();

        if (collectionError || !collection) {
            return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
        }

        // 2. Base Query: Get Products in Collection
        // We filter product_collections first
        const { data: links } = await supabase
            .from('product_collections')
            .select('product_id')
            .eq('collection_id', collection.id);

        let productIds = links?.map(l => l.product_id) || [];

        if (productIds.length === 0) {
            return NextResponse.json({ collection, products: [], meta: { total: 0 } });
        }

        // 3. Apply Dynamic Attribute Filters
        // If we have filters like ?material=linen, we must find products that have that attribute
        if (Object.keys(attributeFilters).length > 0) {
            for (const [key, values] of Object.entries(attributeFilters)) {
                // Handle 'size' and 'color' specifically if they map to variant columns
                if (key === 'size' || key === 'color') {
                    // We'll handle these in the main product query using !inner join if possible,
                    // OR pre-filter IDs here. Pre-filtering IDs is safer for dynamic queries in Supabase.
                    const { data: variantMatches } = await supabase
                        .from('product_variants')
                        .select('product_id')
                        .in(key, values);

                    const validIds = new Set(variantMatches?.map(v => v.product_id));
                    productIds = productIds.filter(id => validIds.has(id));
                } else {
                    // Handle Generic Attributes (e.g. Material, Occasion)
                    // These are stored in 'product_categories' linked to 'categories' table
                    // We need to find products linked to categories where slug IN values
                    const { data: attrMatches } = await supabase
                        .from('product_categories')
                        .select('product_id, categories!inner(slug)')
                        .in('categories.slug', values); // Filter by the attribute value slug

                    const validIds = new Set(attrMatches?.map(a => a.product_id));
                    productIds = productIds.filter(id => validIds.has(id));
                }
            }
        }

        // 4. Fetch Full Product Data
        if (productIds.length === 0) {
            return NextResponse.json({ collection, products: [], meta: { total: 0 } });
        }

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
            } else if (field === 'price') {
                // Price sort handled in memory later
            }
        } else {
            // Default Sort
            productQuery = productQuery.order('position', { ascending: false });
        }

        // 6. Pagination
        const start = (page - 1) * limit;
        productQuery = productQuery.range(start, start + limit - 1);

        const { data: products, error: productsError, count } = await productQuery;

        if (productsError) throw productsError;

        // In-memory Price Sort (if needed)
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
            collection,
            data: sortedProducts, // Standardize prop name to 'data' for ProductListingPage
            meta: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching collection products:', error);
        return NextResponse.json({ error: 'Failed to fetch products.', details: error.message }, { status: 500 });
    }
}