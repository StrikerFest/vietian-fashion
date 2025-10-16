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
            tags (id, name),
            categories (id, name)
        `)
        .eq('id', id)
        .single();

    if (error) return NextResponse.json({ error: `Product not found: ${error.message}` }, { status: 404 });
    return NextResponse.json(data);
}

export async function DELETE(request, context) {
    // @unchanged (DELETE function is the same)
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

export async function PUT(request, context) {
    const params = await context.params;
    const { id: productId } = params;

    // We now accept 'category_id' in the request body
    const { name, description, variants, tags = [], category_id } = await request.json();

    try {
        // @unchanged (Step 1: Update product details is the same)
        const { error: productError } = await supabase
            .from('products')
            .update({ name, description })
            .eq('id', productId);
        if (productError) throw productError;

        // @unchanged (Step 2: Delete all existing variants is the same)
        const { error: deleteError } = await supabase
            .from('product_variants')
            .delete()
            .eq('product_id', productId);
        if (deleteError) throw deleteError;

        // @unchanged (Step 3: Re-create all variants is the same)
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

        // @unchanged (Step 4: Re-create inventory levels is the same)
        const inventoryToInsert = insertedVariants.map((variant, index) => ({
            variant_id: variant.id,
            on_hand: variants[index].on_hand || 0
        }));
        const { error: inventoryError } = await supabase
            .from('inventory_levels')
            .insert(inventoryToInsert);
        if (inventoryError) throw inventoryError;

        // --- NEW: Step 5: Reconcile category link ---
        // Delete all existing category links for this product
        await supabase
            .from('product_categories')
            .delete()
            .eq('product_id', productId);

        // If a new category was provided, insert the new link
        if (category_id) {
            const { error: categoryLinkError } = await supabase
                .from('product_categories')
                .insert({ product_id: productId, category_id: category_id });
            if (categoryLinkError) throw categoryLinkError;
        }

        // @unchanged (Step 6: Reconcile tags is the same)
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

        // @unchanged (Refetch and return is the same)
        const response = await GET(request, context);
        return response;

    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json({ error: 'Failed to update product.', details: error.message }, { status: 500 });
    }
}