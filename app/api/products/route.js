// app/api/products/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    // Pagination Params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const search = searchParams.get('search') || '';

    try {
        let query = supabase
            .from('products')
            .select(`
                *,
                product_variants (
                    *,
                    inventory_levels (*)
                ),
                collections (*),
                
                -- REFACTOR: Fetch Unified Categories (Catalog + Attributes)
                product_categories (
                    categories (
                        id,
                        name,
                        slug,
                        type,
                        parent_id,
                        display_style,
                        value
                    )
                )
            `, { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        // Data Transformation: Flatten the nested structure
        const formattedData = data.map(product => {
            const flatCategories = product.product_categories?.map(pc => pc.categories) || [];

            return {
                ...product,
                // Separate into logical groups for frontend usage
                catalog_categories: flatCategories.filter(c => c.type === 'catalog'),
                attributes: flatCategories.filter(c => c.type === 'attribute'),
                // Remove the raw join array
                product_categories: undefined
            };
        });

        return NextResponse.json({
            data: formattedData,
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Failed to fetch products.', details: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const {
        name,
        description,
        image_url,
        seo_title,
        seo_description,
        variants,
        // Inputs now come as IDs
        attribute_ids = [],
        category_id, // Main catalog category ID
        collection_ids = []
    } = await request.json();

    if (!name || !variants || variants.length === 0) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    let newProductId = null;

    try {
        // 1. Create Product
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

        // 2. Create Variants & Inventory
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
            return {
                variant_id: variant.id,
                on_hand: inputVariant.on_hand ?? 0
            };
        });
        await supabase.from('inventory_levels').insert(inventoryToInsert);

        // 3. Link Collections
        if (collection_ids.length > 0) {
            const collectionLinks = collection_ids.map(id => ({
                product_id: newProductId,
                collection_id: id,
            }));
            await supabase.from('product_collections').insert(collectionLinks);
        }

        // 4. Link Categories (Catalog + Attributes)
        const categoryLinks = [];

        // Main Catalog Category
        if (category_id) {
            categoryLinks.push({ product_id: newProductId, category_id: category_id });
        }

        // Attribute Categories
        if (attribute_ids.length > 0) {
            attribute_ids.forEach(attrId => {
                // Prevent duplicate linking
                if (parseInt(attrId) !== parseInt(category_id)) {
                    categoryLinks.push({ product_id: newProductId, category_id: attrId });
                }
            });
        }

        if (categoryLinks.length > 0) {
            await supabase.from('product_categories').insert(categoryLinks);
        }

        return NextResponse.json(productData);

    } catch (error) {
        console.error('Error creating product:', error);
        if (newProductId) await supabase.from('products').delete().eq('id', newProductId);
        return NextResponse.json({ error: 'Failed to create product.', details: error.message }, { status: 500 });
    }
}