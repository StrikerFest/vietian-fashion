// app/api/product-options/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    // We no longer read 'price' from searchParams, preventing manipulation.

    if (!productId) {
        return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    try {
        // 1. Call the Secure Database Function
        // We pass the productId, and the DB calculates eligibility based on real data.
        // We chain .select() to fetch the nested options efficiently.
        const { data: optionSets, error } = await supabase
            .rpc('get_applicable_option_sets', { query_product_id: parseInt(productId) })
            .select(`
                *,
                product_options (
                    id, type, label, is_required, position, values
                )
            `);

        if (error) throw error;

        // 2. Sort Nested Options (DB returns sets ordered, but we sort items in JS for simplicity)
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