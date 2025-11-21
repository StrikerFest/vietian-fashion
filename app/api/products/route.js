// app/api/products/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                product_variants (
                    *,
                    inventory_levels (*)
                ),
                categories (*),
                collections (*),
                tags (*) 
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    const {
        name,
        description,
        image_url, // --- NEW: Accept image URL ---
        seo_title,
        seo_description,
        variants,
        tags = [],
        category_id,
        collection_ids = []
    } = await request.json();

    if (!name || !variants || variants.length === 0) {
        return NextResponse.json({ error: 'Missing required fields (name, variants).' }, { status: 400 });
    }

    let newProductId = null;

    try {
        const { data: productData, error: productError } = await supabase
            .from('products')
            .insert([{
                name,
                description,
                image_url: image_url || null, // --- NEW: Save image URL ---
                seo_title: seo_title || null,
                seo_description: seo_description || null
            }])
            .select()
            .single();
        if (productError) throw productError;

        newProductId = productData.id;

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

        // --- CRITICAL FIX: Map 'quantity' to 'on_hand' ---
        const inventoryToInsert = insertedVariants.map((variant, index) => {
            const inputVariant = variants[index];
            // Check on_hand first, then quantity, then default to 0
            const initialStock = inputVariant.on_hand ?? inputVariant.quantity ?? 0;

            return {
                variant_id: variant.id,
                on_hand: initialStock
            };
        });

        const { error: inventoryError } = await supabase.from('inventory_levels').insert(inventoryToInsert);
        if (inventoryError) throw inventoryError;

        if (category_id) {
            await supabase.from('product_categories').insert({ product_id: newProductId, category_id: category_id });
        }

        if (collection_ids.length > 0) {
            const collectionLinks = collection_ids.map(collectionId => ({
                product_id: newProductId,
                collection_id: collectionId,
            }));
            await supabase.from('product_collections').insert(collectionLinks);
        }

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
            await supabase.from('product_tags').insert(productTagLinks);
        }

        return NextResponse.json(productData);

    } catch (error) {
        console.error('Full error during product creation:', error);
        if (newProductId) {
            await supabase.from('products').delete().eq('id', newProductId);
        }
        return NextResponse.json({ error: 'Failed to create product.', details: error.message }, { status: 500 });
    }
}