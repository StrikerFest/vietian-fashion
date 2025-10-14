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


// In app/api/products/route.js
export async function POST(request) {
    const { name, description, variants, tags = [] } = await request.json();

    if (!name || !variants || variants.length === 0) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    try {
        const { data: productData, error: productError } = await supabase
            .from('products')
            .insert([{ name, description }])
            .select()
            .single();

        if (productError) throw productError;
        const newProductId = productData.id;

        const variantsToInsert = variants.map(v => ({ ...v, product_id: newProductId }));
        const { error: variantError } = await supabase.from('product_variants').insert(variantsToInsert);

        if (variantError) throw variantError;

        if (tags.length > 0) {
            const tagObjects = await Promise.all(
                tags.map(async (tagName) => {
                    let { data: existingTag } = await supabase.from('tags').select('id').eq('name', tagName).single();

                    if (!existingTag) {
                        let { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select('id').single();
                        return { tag_id: newTag.id };
                    } else {
                        return { tag_id: existingTag.id };
                    }
                })
            );

            const productTagLinks = tagObjects.map(tagObj => ({
                product_id: newProductId,
                tag_id: tagObj.tag_id
            }));

            const { error: productTagsError } = await supabase.from('product_tags').insert(productTagLinks);
            if (productTagsError) throw productTagsError;
        }

        return NextResponse.json({ ...productData, variants: variantsToInsert });

    } catch (error) {
        console.error('Full error:', error);
        if (error.code && productData?.id) {
            await supabase.from('products').delete().eq('id', productData.id);
        }
        return NextResponse.json({ error: 'Failed to create product.', details: error.message }, { status: 500 });
    }
}