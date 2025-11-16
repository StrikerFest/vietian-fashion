// app/api/products/collection/[slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    if (!slug) {
        return NextResponse.json({ error: 'Collection slug is required.' }, { status: 400 });
    }

    const sortBy = searchParams.get('sort');
    const sizes = searchParams.getAll('size').filter(size => size);
    const colors = searchParams.getAll('color').filter(color => color);

    try {
        // @unchanged (Step 1: Find the collection)
        const { data: collection, error: collectionError } = await supabase
            .from('collections') //
            .select('id, name, description, seo_title, seo_description') // Added SEO fields
            .eq('slug', slug) //
            .single();
        if (collectionError || !collection) {
            return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
        }
        const collectionId = collection.id;

        // @unchanged (Step 2: Find product links)
        const { data: productLinks, error: linkError } = await supabase
            .from('product_collections') //
            .select('product_id') //
            .eq('collection_id', collectionId); //
        if (linkError) throw linkError;
        if (!productLinks || productLinks.length === 0) {
            return NextResponse.json({ collection, products: [] });
        }
        const productIdsInCollection = productLinks.map(link => link.product_id);

        // --- MODIFIED: Changed joins from !inner to !left (default) ---
        // This ensures products in the collection are shown even if they have
        // no variants or inventory, matching the logic of /api/products
        let productQuery = supabase
            .from('products') //
            .select(`
                id, name, description,
                product_variants (
                    id, sku, price, size, color,
                    inventory_levels ( on_hand, committed )
                )
            `)
            .in('id', productIdsInCollection);

        // @unchanged (Apply filters)
         if (sizes.length > 0 || colors.length > 0) {
            // This filter correctly applies to the joined table
            if (sizes.length > 0) {
                productQuery = productQuery.in('product_variants.size', sizes); //
            }
            if (colors.length > 0) {
                productQuery = productQuery.in('product_variants.color', colors); //
            }
        }


        // @unchanged (Apply sorting)
        if (sortBy) {
// @unchanged (rest of sorting logic)
            const [field, direction] = sortBy.split('-');
            const ascending = direction === 'asc';
            if (field === 'name') {
                productQuery = productQuery.order('name', { ascending });
            }
        } else {
             productQuery = productQuery.order('created_at', { ascending: false });
        }

        // @unchanged (Execute query and post-fetch sorting)
        const { data: products, error: productsError } = await productQuery;
// @unchanged (rest of function)
        if (productsError) throw productsError;

        let sortedProducts = products;
        if (sortBy?.startsWith('price')) {
             const ascending = sortBy.endsWith('asc');
             sortedProducts.sort((a, b) => {
                 const priceA = a.product_variants[0]?.price || 0;
                 const priceB = b.product_variants[0]?.price || 0;
                 return ascending ? priceA - priceB : priceB - priceA;
             });
        }

        // Return collection (now with SEO fields) and products
        return NextResponse.json({ collection, products: sortedProducts });

    } catch (error) {
        console.error('Error fetching filtered products by collection:', error);
        return NextResponse.json({ error: 'Failed to fetch filtered products.', details: error.message }, { status: 500 });
    }
}