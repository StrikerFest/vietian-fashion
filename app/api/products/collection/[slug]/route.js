// app/api/products/collection/[slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url); // Get URL query parameters

    if (!slug) {
        return NextResponse.json({ error: 'Collection slug is required.' }, { status: 400 });
    }

    // --- NEW: Parse Filter and Sort Parameters ---
    const sortBy = searchParams.get('sort'); // e.g., 'price-asc', 'price-desc', 'name-asc'
    const sizes = searchParams.getAll('size'); // Can have multiple: ?size=S&size=M
    const colors = searchParams.getAll('color'); // Can have multiple: ?color=Blue&color=Red

    try {
        // Step 1: Find the collection ID from its slug.
        const { data: collection, error: collectionError } = await supabase
            .from('collections')
            .select('id, name, description')
            .eq('slug', slug)
            .single();
        if (collectionError || !collection) {
            return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
        }
        const collectionId = collection.id;

        // Step 2: Find all product IDs linked to this collection.
        const { data: productLinks, error: linkError } = await supabase
            .from('product_collections')
            .select('product_id')
            .eq('collection_id', collectionId);
        if (linkError) throw linkError;
        if (!productLinks || productLinks.length === 0) {
            return NextResponse.json({ collection, products: [] });
        }
        const productIdsInCollection = productLinks.map(link => link.product_id);

        // --- Step 3: Build the Dynamic Product Query ---
        let productQuery = supabase
            .from('products')
            .select(`
                id, name, description,
                product_variants!inner (
                    id, sku, price, size, color,
                    inventory_levels!inner ( on_hand, committed )
                )
            `)
            .in('id', productIdsInCollection); // Filter by products in this collection

        // --- Apply Variant Filters ---
        if (sizes.length > 0 || colors.length > 0) {
            productQuery = productQuery.filter('product_variants.id', 'not.is', null);
            if (sizes.length > 0) {
                productQuery = productQuery.in('product_variants.size', sizes);
            }
            if (colors.length > 0) {
                productQuery = productQuery.in('product_variants.color', colors);
            }
        }

        // --- Apply Sorting ---
        if (sortBy) {
            const [field, direction] = sortBy.split('-');
            const ascending = direction === 'asc';
            if (field === 'name') {
                productQuery = productQuery.order('name', { ascending });
            }
            // Price sorting will be handled after fetching
        } else {
             productQuery = productQuery.order('created_at', { ascending: false }); // Default sort
        }

        // Execute the query
        const { data: products, error: productsError } = await productQuery;
        if (productsError) throw productsError;

        // --- Post-fetch Sorting by Price (if requested) ---
        let sortedProducts = products;
        if (sortBy?.startsWith('price')) {
             const ascending = sortBy.endsWith('asc');
             // Sort based on the price of the *first* variant for simplicity
             sortedProducts.sort((a, b) => {
                 const priceA = a.product_variants[0]?.price || 0;
                 const priceB = b.product_variants[0]?.price || 0;
                 return ascending ? priceA - priceB : priceB - priceA;
             });
        }

        return NextResponse.json({ collection, products: sortedProducts });

    } catch (error) {
        console.error('Error fetching filtered products by collection:', error);
        return NextResponse.json({ error: 'Failed to fetch filtered products.', details: error.message }, { status: 500 });
    }
}