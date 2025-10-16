// app/api/products/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all products with their inventory levels
export async function GET() {
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (
                *,
                inventory_levels (*)
            )
        `);

    if (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}

// POST a new product and its inventory
export async function POST(request) {
    const { name, description, variants, tags = [] } = await request.json();

    if (!name || !variants || variants.length === 0) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    let newProductId = null; // To track the product ID for cleanup on failure

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

        // Step 4: Handle tags (logic remains the same)
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

        // Step 5: Refetch the complete product data to return a consistent response
        const { data: fullNewProduct, error: fetchError } = await supabase
            .from('products')
            .select('*, product_variants(*, inventory_levels(*)), tags(*)')
            .eq('id', newProductId)
            .single();
        if (fetchError) throw fetchError;

        return NextResponse.json(fullNewProduct);

    } catch (error) {
        console.error('Full error during product creation:', error);
        // If any step fails, attempt to delete the orphaned product
        if (newProductId) {
            await supabase.from('products').delete().eq('id', newProductId);
        }
        return NextResponse.json({ error: 'Failed to create product.', details: error.message }, { status: 500 });
    }
}