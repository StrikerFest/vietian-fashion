import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    // Following the error's instruction to await the params object
    const params = await context.params;
    const { id } = params;

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
        return NextResponse.json({ error: `Product not found. Supabase: ${error.message}` }, { status: 404 });
    }

    return NextResponse.json(data);
}