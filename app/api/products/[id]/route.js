// app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    // --- FIX: Removed await from context.params ---
    const { params } = context;
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Product ID required' }, { status: 400 });
    }
    const numericProductId = parseInt(id);

    // @unchanged (Select logic)
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*, inventory_levels (*)),
            tags (id, name),
            categories (id, name),
            collections (id, name)
        `)
        .eq('id', numericProductId)
        .single();

    if (error) {
         if (error.code === 'PGRST116') {
            return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
        }
        console.error(`Error fetching product ${numericProductId}:`, error);
        return NextResponse.json({ error: `Failed to fetch product: ${error.message}` }, { status: 500 });
    }
     if (!data) {
         return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }
    return NextResponse.json(data);
}

export async function DELETE(request, context) {
    // --- FIX: Removed await from context.params ---
    const { params } = context;
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Product ID is required' }, { status: 400 });
    }
     const numericProductId = parseInt(id);

    try {
        // @unchanged (Delete logic)
        const { data: variantsToDelete, error: variantFetchError } = await supabase
            .from('product_variants').select('id').eq('product_id', numericProductId);
        if (variantFetchError) throw variantFetchError;

        if (variantsToDelete && variantsToDelete.length > 0) {
            const variantIds = variantsToDelete.map(v => v.id);
            await supabase.from('inventory_levels').delete().in('variant_id', variantIds);
            await supabase.from('product_variants').delete().eq('product_id', numericProductId);
        }

        await supabase.from('product_categories').delete().eq('product_id', numericProductId);
        await supabase.from('product_collections').delete().eq('product_id', numericProductId);
        await supabase.from('product_tags').delete().eq('product_id', numericProductId);

        const { error } = await supabase.from('products').delete().eq('id', numericProductId);
        if (error) throw error;

        return NextResponse.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error(`Error deleting product ${numericProductId}:`, error);
        return NextResponse.json({ error: 'Failed to delete product.', details: error.message }, { status: 500 });
    }
}


// --- REVERTED PUT function (using upsert) ---
export async function PUT(request, context) {
    const params = await context.params;
    const { id: productId } = params;

     if (!productId || isNaN(parseInt(productId))) {
        return NextResponse.json({ error: 'Valid Product ID is required' }, { status: 400 });
    }
    const numericProductId = parseInt(productId);

    // @unchanged (Extract data from body)
    const {
        name,
        description,
        seo_title,
        seo_description,
        variants,
        tags = [],
        category_id,
        collection_ids = []
    } = await request.json();

     if (!name || !variants) {
        return NextResponse.json({ error: 'Missing required fields (name, variants).' }, { status: 400 });
    }

    try {
        // @unchanged (Step 1: Update product details)
        const { error: productError } = await supabase
            .from('products')
            .update({
                name,
                description,
                seo_title: seo_title || null,
                seo_description: seo_description || null
             })
            .eq('id', numericProductId);
        if (productError) throw productError;

        // --- Step 2: REVERTED Variant and Inventory Reconciliation ---

        // 2A: Prepare variants for upsert.
        // We do *not* send the 'id' field, only the 'sku' for conflict resolution.
        const variantsToUpsert = variants.map(v => ({
            sku: v.sku,
            price: v.price,
            size: v.size,
            color: v.color,
            product_id: numericProductId
        }));

        // 2B: Upsert these variants using 'sku' as the conflict target.
        const { data: upsertedVariants, error: variantError } = await supabase
            .from('product_variants')
            .upsert(variantsToUpsert, {
                onConflict: 'sku' // Assumes 'sku' has a UNIQUE constraint
            })
            .select('id, sku'); // Get back the IDs (new or existing)

        if (variantError) {
            // This is where the '42P10' error was being thrown
            throw new Error(`Variant upsert error: ${variantError.message}`);
        }

        // 2C: Delete any variants that are *not* in the submitted list.
        const upsertedVariantIds = upsertedVariants.map(v => v.id);

        if (upsertedVariantIds.length > 0) {
            const { error: deleteError } = await supabase
                .from('product_variants')
                .delete()
                .eq('product_id', numericProductId)
                .not('id', 'in', `(${upsertedVariantIds.join(',')})`);

             if (deleteError) {
                // This will fail if an old, deleted variant is part of an order
                console.warn(`Could not delete old variants, they might be in an order. ${deleteError.message}`);
            }
        } else {
            // User removed all variants
            const { error: deleteAllError } = await supabase
                .from('product_variants')
                .delete()
                .eq('product_id', numericProductId);

            if (deleteAllError) {
                 console.warn(`Could not delete all variants, they might be in an order. ${deleteAllError.message}`);
            }
        }

        // 2D: Reconcile Inventory
        const inventoryToUpsert = variants.map(clientVariant => {
            // Find the matching variant from the DB list we just upserted
            const dbVariant = upsertedVariants.find(v => v.sku === clientVariant.sku);
            return {
                variant_id: dbVariant.id, // Use the correct database variant ID
                on_hand: clientVariant.on_hand || 0
            };
        });

        if (inventoryToUpsert.length > 0) {
             const { error: inventoryError } = await supabase
                .from('inventory_levels')
                .upsert(inventoryToUpsert, { onConflict: 'variant_id' });

            if (inventoryError) throw inventoryError;
        }

        // @unchanged (Steps 3-6: Categories, Collections, Tags, Refetch)
        await supabase.from('product_categories').delete().eq('product_id', numericProductId);
        if (category_id) {
            await supabase.from('product_categories').insert({ product_id: numericProductId, category_id: category_id });
        }

        await supabase.from('product_collections').delete().eq('product_id', numericProductId);
        if (collection_ids && collection_ids.length > 0) {
            const collectionLinks = collection_ids.map(collectionId => ({ product_id: numericProductId, collection_id: collectionId }));
            await supabase.from('product_collections').insert(collectionLinks);
        }

        await supabase.from('product_tags').delete().eq('product_id', numericProductId);
        if (tags && tags.length > 0) {
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
            const productTagLinks = tagObjects.map(tagObj => ({ product_id: numericProductId, tag_id: tagObj.tag_id }));
            await supabase.from('product_tags').insert(productTagLinks);
        }

        const updatedContext = { params: { id: numericProductId } };
        const response = await GET(request, updatedContext);
        return response;

    } catch (error) {
        console.error(`Error updating product ${numericProductId}:`, error);
        return NextResponse.json({ error: 'Failed to update product.', details: error.message }, { status: 500 });
    }
}