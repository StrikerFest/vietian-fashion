// app/api/products/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// @unchanged (GET function remains the same)
export async function GET() {
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
            tags (*) // Also fetch tags here for consistency
        `)
        .order('created_at', { ascending: false }); // Default order

    if (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}

export async function POST(request) {
    // --- Extract SEO fields from the request body ---
    const {
        name,
        description,
        seo_title, //
        seo_description, //
        variants,
        tags = [],
        category_id,
        collection_ids = []
    } = await request.json();

    // @unchanged (Validation for name and variants)
    if (!name || !variants || variants.length === 0) {
        return NextResponse.json({ error: 'Missing required fields (name, variants).' }, { status: 400 });
    }

    let newProductId = null;

    try {
        // --- Step 1: Insert the main product, including SEO fields ---
        const { data: productData, error: productError } = await supabase
            .from('products') //
            .insert([{
                name,
                description,
                seo_title: seo_title || null, // Add seo_title
                seo_description: seo_description || null // Add seo_description
            }])
            .select()
            .single();
        if (productError) throw productError;

        newProductId = productData.id;

        // @unchanged (Step 2: Insert variants)
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

        // @unchanged (Step 3: Insert inventory levels)
        const inventoryToInsert = insertedVariants.map((variant, index) => ({
            variant_id: variant.id,
            on_hand: variants[index].on_hand || 0
        }));
        const { error: inventoryError } = await supabase.from('inventory_levels').insert(inventoryToInsert); //
        if (inventoryError) throw inventoryError;

        // @unchanged (Step 4: Link product to category)
        if (category_id) { //
            const { error: categoryLinkError } = await supabase
                .from('product_categories')
                .insert({ product_id: newProductId, category_id: category_id });
            if (categoryLinkError) throw categoryLinkError;
        }

        // @unchanged (Step 5: Link product to collections)
        if (collection_ids.length > 0) { //
            const collectionLinks = collection_ids.map(collectionId => ({
                product_id: newProductId,
                collection_id: collectionId,
            }));
            const { error: collectionLinkError } = await supabase.from('product_collections').insert(collectionLinks); //
            if (collectionLinkError) throw collectionLinkError;
        }

        // @unchanged (Step 6: Handle tags)
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


        // --- Step 7: Refetch the complete product data (query includes SEO fields implicitly via *) ---
        const { data: fullNewProduct, error: fetchError } = await supabase
            .from('products') //
            // Ensure the select includes all necessary related data, including SEO fields (implicitly included by *)
            .select(`
                *,
                product_variants(*, inventory_levels(*)),
                tags(*),
                categories(*),
                collections(*)
             `)
            .eq('id', newProductId) //
            .single();
        if (fetchError) throw fetchError;

        return NextResponse.json(fullNewProduct);

    } catch (error) {
        console.error('Full error during product creation:', error);
        // Attempt to clean up the product if subsequent steps failed
        if (newProductId) {
             console.log(`Attempting to clean up product ID: ${newProductId}`);
             await supabase.from('products').delete().eq('id', newProductId); //
        }
        return NextResponse.json({ error: 'Failed to create product.', details: error.message }, { status: 500 });
    }
}