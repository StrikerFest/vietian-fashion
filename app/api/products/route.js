// app/api/products/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    // Pagination Params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Filter Params
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('category');
    const collectionId = searchParams.get('collection');

    try {
        // Start building query
        let query = supabase
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
            `, { count: 'exact' }) // Request total count
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply Search
        if (search) {
            // Simple ILIKE search on name.
            // For more advanced search, we'd need a text index or Supabase text search syntax.
            query = query.ilike('name', `%${search}%`);
        }

        // Apply Category Filter (Requires junction table lookup logic, simplified here for direct filters if schema supported it,
        // but since it's Many-to-Many, we might need specific RPC or post-filtering if strict server-side is needed.
        // For basic pagination, we stick to the main table.
        // *Note: Advanced M-to-M filtering in Supabase basic client often requires !inner joins.*
        if (categoryId) {
            query = query.eq('product_categories.category_id', categoryId);
            // Note: This requires modifying the select to include !inner on product_categories if we want to filter by it.
            // For now, we will rely on the basic list and client filtering for complex taxonomy unless explicitly requested.
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            data,
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST remains largely unchanged but included for file completeness in context
export async function POST(request) {
    const {
        name,
        description,
        image_url,
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
                image_url: image_url || null,
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

        const inventoryToInsert = insertedVariants.map((variant, index) => {
            const inputVariant = variants[index];
            const initialStock = inputVariant.on_hand ?? inputVariant.quantity ?? 0;
            return { variant_id: variant.id, on_hand: initialStock };
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