import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// We now use 'context' as the second argument
export async function GET(request, context) {
    // And we get the id from context.params
    const { id } = context.params;

    if (!id) {
        return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching product:', error);
        // It's more helpful to return the actual Supabase error in development
        return NextResponse.json({ error: `Product not found. Supabase: ${error.message}` }, { status: 404 });
    }

    return NextResponse.json(data);
}
