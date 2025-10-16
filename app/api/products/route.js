// app/api/products/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    // @unchanged (GET function from inventory update is sufficient, but we add collections for consistency)
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (
                *,
                inventory_levels (*)
            ),
            categories (*),
            collections (*)
        `);

    if (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}

export async function POST(request) {
    // We now accept 'collection_ids' in the request body
    const { name, description, variants, tags = [], category_id, collection_ids = [] } = await request.json();

    if (!name || !variants || variants.length === 0) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    let newProductId = null;

    try {
        // Step 1: Insert the main product
        const { data: productData, error: productError } = await supabase
            .from('products')
            .insert([{ name, description }])
            .select()
            .single();
        if (productError) throw productError;

        newProductId = productData.id;

        // Step 2: Insert variants (without inventory data)
        const variantsToInsert = variants.map(v => ({
            sku: v.sku,
            price: v.price,
            size: v.size,
            color: v.color,
            product_id: newProductId
        }));
        const { data: insertedVariants, error: variantError } = await supabase
            .from('product_variants')
            .insert(variantsToInsert)
            .select();
        if (variantError) throw variantError;

        // Step 3: Use the returned variant IDs to create their inventory records
        const inventoryToInsert = insertedVariants.map((variant, index) => ({
            variant_id: variant.id,
            on_hand: variants[index].on_hand || 0
        }));
        const { error: inventoryError } = await supabase.from('inventory_levels').insert(inventoryToInsert);
        if (inventoryError) throw inventoryError;

        // --- NEW: Step 4: Link product to its category ---
        if (category_id) {
            const { error: categoryLinkError } = await supabase
                .from('product_categories')
                .insert({ product_id: newProductId, category_id: category_id });
            if (categoryLinkError) throw categoryLinkError;
        }

        // --- NEW: Step 5: Link product to its collections ---
        if (collection_ids.length > 0) {
            const collectionLinks = collection_ids.map(collectionId => ({
                product_id: newProductId,
                collection_id: collectionId,
            }));
            const { error: collectionLinkError } = await supabase.from('product_collections').insert(collectionLinks);
            if (collectionLinkError) throw collectionLinkError;
        }

        // @unchanged (Step 6: Handle tags is the same)
        if (tags.length > 0) {
            const tagObjects = await Promise.all(
                tags.map(async (tagName) => {
                    let { data: existingTag } = await supabase.from('tags').select('id').eq('name', tagName).single();
                    if (!existingTag) {
                        let { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select('id').single();
                        return { tag_id: newTag.id };
                    }
                    return { tag_id: existingTag.id };
                })
            );
            const productTagLinks = tagObjects.map(tagObj => ({ product_id: newProductId, tag_id: tagObj.tag_id }));
            const { error: productTagsError } = await supabase.from('product_tags').insert(productTagLinks);
            if (productTagsError) throw productTagsError;
        }

        // @unchanged (Step 7: Refetch the complete product data is the same, but the query is updated)
        const { data: fullNewProduct, error: fetchError } = await supabase
            .from('products')
            .select('*, product_variants(*, inventory_levels(*)), tags(*), categories(*), collections(*)')
            .eq('id', newProductId)
            .single();
        if (fetchError) throw fetchError;

        return NextResponse.json(fullNewProduct);

    } catch (error) {
        console.error('Full error during product creation:', error);
        if (newProductId) {
            await supabase.from('products').delete().eq('id', newProductId);
        }
        return NextResponse.json({ error: 'Failed to create product.', details: error.message }, { status: 500 });
    }
}