// app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// @unchanged (GET function remains the same, implicitly includes SEO fields via *)
export async function GET(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Product ID required' }, { status: 400 });
    }
    const numericProductId = parseInt(id);


    // Select *, which includes the seo_title and seo_description fields
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*, inventory_levels (*)),
            tags (id, name),
            categories (id, name),
            collections (id, name)
        `)
        .eq('id', numericProductId) //
        .single();

    if (error) {
        // Handle not found error specifically
         if (error.code === 'PGRST116') { // PostgREST error for zero rows returned
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

// @unchanged (DELETE function remains the same)
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Product ID is required' }, { status: 400 });
    }
     const numericProductId = parseInt(id);


    try {
        // --- Optional but Recommended: Delete related data first in specific order ---
        // 1. Delete order items (if necessary, depends on ON DELETE cascade/restrict)
        // await supabase.from('order_items').delete().in('variant_id', variantIds); // Need variantIds first

        // 2. Delete inventory levels
        const { data: variantsToDelete, error: variantFetchError } = await supabase
            .from('product_variants').select('id').eq('product_id', numericProductId); //
        if (variantFetchError) throw variantFetchError;

        if (variantsToDelete && variantsToDelete.length > 0) {
            const variantIds = variantsToDelete.map(v => v.id);
            await supabase.from('inventory_levels').delete().in('variant_id', variantIds); //
            // 3. Delete product variants
            await supabase.from('product_variants').delete().eq('product_id', numericProductId); //
        }

        // 4. Delete junction table entries
        await supabase.from('product_categories').delete().eq('product_id', numericProductId); //
        await supabase.from('product_collections').delete().eq('product_id', numericProductId); //
        await supabase.from('product_tags').delete().eq('product_id', numericProductId); //
        // 5. Delete reviews (if desired, depends on requirements)
        // await supabase.from('reviews').delete().eq('product_id', numericProductId); //
        // 6. Delete product images (if applicable)
        // await supabase.from('product_images').delete().eq('product_id', numericProductId); //


        // --- Finally, delete the product itself ---
        const { error } = await supabase.from('products').delete().eq('id', numericProductId); //
        if (error) throw error;

        return NextResponse.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error(`Error deleting product ${numericProductId}:`, error);
        return NextResponse.json({ error: 'Failed to delete product.', details: error.message }, { status: 500 });
    }
}


// --- Modified PUT function ---
export async function PUT(request, context) {
    const params = await context.params;
    const { id: productId } = params;

     if (!productId || isNaN(parseInt(productId))) {
        return NextResponse.json({ error: 'Valid Product ID is required' }, { status: 400 });
    }
    const numericProductId = parseInt(productId);


    // --- Extract SEO fields along with existing fields ---
    const {
        name,
        description,
        seo_title, //
        seo_description, //
        variants,
        tags = [],
        category_id,
        collection_ids = []
    } = await request.json();

     // Basic validation
     if (!name || !variants || variants.length === 0) {
        return NextResponse.json({ error: 'Missing required fields (name, variants).' }, { status: 400 });
    }

    try {
        // --- Step 1: Update product details, including SEO ---
        const { error: productError } = await supabase
            .from('products') //
            .update({
                name,
                description,
                seo_title: seo_title || null, // Update seo_title
                seo_description: seo_description || null // Update seo_description
             })
            .eq('id', numericProductId); //
        if (productError) throw productError;

        // --- Step 2: Reconcile Variants and Inventory ---
        // Fetch existing variants to know which inventory levels to delete
        const { data: existingVariants, error: fetchVariantsError } = await supabase
            .from('product_variants').select('id').eq('product_id', numericProductId); //
        if (fetchVariantsError) throw fetchVariantsError;

        if (existingVariants && existingVariants.length > 0) {
            const existingVariantIds = existingVariants.map(v => v.id);
            // Delete old inventory levels first
            await supabase.from('inventory_levels').delete().in('variant_id', existingVariantIds); //
            // Then delete old variants
            await supabase.from('product_variants').delete().eq('product_id', numericProductId); //
        }

        // Insert new variants
        const variantsToInsert = variants.map(v => ({
            sku: v.sku,
            price: v.price,
            size: v.size,
            color: v.color,
            product_id: numericProductId //
        }));
        const { data: insertedVariants, error: variantError } = await supabase
            .from('product_variants')
            .insert(variantsToInsert)
            .select();
        if (variantError) throw variantError;

        // Insert new inventory levels
        const inventoryToInsert = insertedVariants.map((variant, index) => ({
            variant_id: variant.id,
            on_hand: variants[index].on_hand || 0
        }));
        const { error: inventoryError } = await supabase
            .from('inventory_levels') //
            .insert(inventoryToInsert);
        if (inventoryError) throw inventoryError;


        // @unchanged (Step 3: Reconcile category link)
        await supabase
            .from('product_categories') //
            .delete()
            .eq('product_id', numericProductId); //
        if (category_id) { //
            const { error: categoryLinkError } = await supabase
                .from('product_categories') //
                .insert({ product_id: numericProductId, category_id: category_id }); //
            if (categoryLinkError) throw categoryLinkError;
        }

        // @unchanged (Step 4: Reconcile collection links)
        await supabase.from('product_collections').delete().eq('product_id', numericProductId); //
        if (collection_ids && collection_ids.length > 0) { //
            const collectionLinks = collection_ids.map(collectionId => ({
                product_id: numericProductId,
                collection_id: collectionId, //
            }));
            await supabase.from('product_collections').insert(collectionLinks); //
        }

        // @unchanged (Step 5: Reconcile tags)
        await supabase.from('product_tags').delete().eq('product_id', numericProductId); //
        if (tags && tags.length > 0) {
             const tagObjects = await Promise.all(
                tags.map(async (tagName) => {
                    let { data: existingTag } = await supabase.from('tags').select('id').eq('name', tagName).single(); //
                    if (!existingTag) {
                        let { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select('id').single(); //
                        return { tag_id: newTag.id }; //
                    }
                    return { tag_id: existingTag.id }; //
                })
            );
            const productTagLinks = tagObjects.map(tagObj => ({ product_id: numericProductId, tag_id: tagObj.tag_id })); //
            await supabase.from('product_tags').insert(productTagLinks); //
        }

        // --- Step 6: Refetch and return the updated product using the existing GET logic ---
        // Pass a modified context with the numeric ID
        const updatedContext = { params: { id: numericProductId } };
        const response = await GET(request, updatedContext); // Call the GET function in this file
        return response; // Return the response from GET

    } catch (error) {
        console.error(`Error updating product ${numericProductId}:`, error);
        return NextResponse.json({ error: 'Failed to update product.', details: error.message }, { status: 500 });
    }
}