// app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const { data, error } = await supabase
        .from('products')
        .select(`
            *, 
            product_variants (*, inventory_levels (*)), 
            tags (id, name)
        `)
        .eq('id', id)
        .single();

    if (error) return NextResponse.json({ error: `Product not found: ${error.message}` }, { status: 404 });
    return NextResponse.json(data);
}

export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });

    try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ message: 'Product deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete product.', details: error.message }, { status: 500 });
    }
}

// --- COMPLETELY REWRITTEN PUT FUNCTION ---
export async function PUT(request, context) {
    const params = await context.params;
    const { id: productId } = params;

    const { name, description, variants, tags = [] } = await request.json();

    try {
        // Step 1: Update the main product details (name, description).
        const { error: productError } = await supabase
            .from('products')
            .update({ name, description })
            .eq('id', productId);
        if (productError) throw productError;

        // Step 2: Delete all existing variants for this product.
        // The `ON DELETE CASCADE` constraint on `inventory_levels` will automatically
        // delete the associated inventory records.
        const { error: deleteError } = await supabase
            .from('product_variants')
            .delete()
            .eq('product_id', productId);
        if (deleteError) throw deleteError;

        // Step 3: Re-create all variants from the submitted form data.
        const variantsToInsert = variants.map(v => ({
            sku: v.sku,
            price: v.price,
            size: v.size,
            color: v.color,
            product_id: productId
        }));
        const { data: insertedVariants, error: variantError } = await supabase
            .from('product_variants')
            .insert(variantsToInsert)
            .select();
        if (variantError) throw variantError;

        // Step 4: Re-create the inventory levels for the new variants.
        const inventoryToInsert = insertedVariants.map((variant, index) => ({
            variant_id: variant.id,
            on_hand: variants[index].on_hand || 0
        }));
        const { error: inventoryError } = await supabase
            .from('inventory_levels')
            .insert(inventoryToInsert);
        if (inventoryError) throw inventoryError;

        // Step 5: Reconcile tags (same logic as before).
        await supabase.from('product_tags').delete().eq('product_id', productId);
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
            const productTagLinks = tagObjects.map(tagObj => ({ product_id: productId, tag_id: tagObj.tag_id }));
            await supabase.from('product_tags').insert(productTagLinks);
        }

        // Refetch and return the fully updated product data.
        const response = await GET(request, context);
        return response;

    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json({ error: 'Failed to update product.', details: error.message }, { status: 500 });
    }
}