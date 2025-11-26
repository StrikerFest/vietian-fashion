// app/api/product-options/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const variantId = searchParams.get('variantId'); // New parameter

    if (!productId) {
        return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    try {
        // Call the updated RPC function with both IDs
        const { data: optionSets, error } = await supabase
            .rpc('get_applicable_option_sets', {
                query_product_id: parseInt(productId),
                query_variant_id: variantId ? parseInt(variantId) : null
            })
            .select(`
                *,
                product_options (
                    id, type, label, is_required, position, values
                )
            `);

        if (error) throw error;

        const result = optionSets.map(set => ({
            ...set,
            product_options: set.product_options
                ? set.product_options.sort((a, b) => a.position - b.position)
                : []
        }));

        return NextResponse.json(result);

    } catch (error) {
        console.error('Option fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}