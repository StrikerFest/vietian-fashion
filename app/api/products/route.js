// app/api/products/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    // Select all columns from 'products' and all related 'product_variants'
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*)
        `);

    if (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}


export async function POST(request) {
    try {
        const { name, description, variants } = await request.json();

        if (!name || !description || !variants || variants.length === 0) {
            return NextResponse.json({ error: 'Missing required fields: name, description, and at least one variant.' }, { status: 400 });
        }

        // Insert the main product and return its data
        const { data: productData, error: productError } = await supabase
            .from('products')
            .insert([
                { name, description }
            ])
            .select()
            .single();

        if (productError) {
            console.error('Error creating product:', productError);
            throw new Error(productError.message);
        }

        // Add the new product's ID to each variant
        const variantsWithProductId = variants.map(variant => ({
            product_id: productData.id,
            sku: variant.sku,
            price: variant.price,
            size: variant.size,
            color: variant.color,
            quantity: variant.quantity
        }));

        // Insert all the variants
        const { error: variantError } = await supabase
            .from('product_variants')
            .insert(variantsWithProductId);

        if (variantError) {
            console.error('Error creating variants:', variantError);
            await supabase.from('products').delete().eq('id', productData.id);
            throw new Error(variantError.message);
        }

        return NextResponse.json({ ...productData, variants: variantsWithProductId });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}