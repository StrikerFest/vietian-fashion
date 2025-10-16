// app/api/products/collection/[slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;

    if (!slug) {
        return NextResponse.json({ error: 'Collection slug is required.' }, { status: 400 });
    }

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
            // Return the collection info even if it's empty.
            return NextResponse.json({ collection, products: [] });
        }

        const productIds = productLinks.map(link => link.product_id);

        // Step 3: Fetch all products that match the found IDs.
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
                *,
                product_variants (
                    *,
                    inventory_levels (*)
                )
            `)
            .in('id', productIds);

        if (productsError) throw productsError;

        return NextResponse.json({ collection, products });

    } catch (error) {
        console.error('Error fetching products by collection:', error);
        return NextResponse.json({ error: 'Failed to fetch products for this collection.', details: error.message }, { status: 500 });
    }
}