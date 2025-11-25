// app/api/products/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    try {
        let query = supabase
            .from('products')
            .select(`*, product_variants (*, inventory_levels (*)), collections (*), product_categories (categories (id, name, slug, type))`, { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (search) query = query.ilike('name', `%${search}%`);

        const { data, error, count } = await query;
        if (error) throw error;

        const formattedData = data.map(product => ({
            ...product,
            catalog_categories: product.product_categories?.map(pc => pc.categories).filter(c => c.type === 'catalog') || [],
            attributes: product.product_categories?.map(pc => pc.categories).filter(c => c.type === 'attribute') || [],
            product_categories: undefined
        }));

        return NextResponse.json({ data: formattedData, meta: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) } });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const {
        name, description, image_url, seo_title, seo_description, variants,
        attribute_ids = [], category_id, collection_ids = []
    } = await request.json();

    if (!name || !variants || variants.length === 0) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    let newProductId = null;

    try {
        // 1. Product
        const { data: productData, error: productError } = await supabase
            .from('products')
            .insert([{ name, description, image_url: image_url || null, seo_title: seo_title || null, seo_description: seo_description || null }])
            .select().single();

        if (productError) throw productError;
        newProductId = productData.id;

        // 2. Variants & Inventory
        const variantsToInsert = variants.map(v => ({ sku: v.sku, price: v.price, size: v.size, color: v.color, product_id: newProductId }));
        const { data: insertedVariants, error: variantError } = await supabase.from('product_variants').insert(variantsToInsert).select();
        if (variantError) throw variantError;

        const inventoryToInsert = insertedVariants.map((variant, index) => ({
            variant_id: variant.id,
            on_hand: variants[index].on_hand ?? 0
        }));
        await supabase.from('inventory_levels').insert(inventoryToInsert);

        // 3. Relationships
        if (collection_ids.length > 0) {
            await supabase.from('product_collections').insert(collection_ids.map(id => ({ product_id: newProductId, collection_id: id })));
        }

        const categoryLinks = [];
        if (category_id) categoryLinks.push({ product_id: newProductId, category_id: category_id });
        attribute_ids.forEach(aid => { if (parseInt(aid) !== parseInt(category_id)) categoryLinks.push({ product_id: newProductId, category_id: aid }); });
        if (categoryLinks.length > 0) await supabase.from('product_categories').insert(categoryLinks);

        return NextResponse.json(productData);

    } catch (error) {
        if (newProductId) await supabase.from('products').delete().eq('id', newProductId);
        return NextResponse.json({ error: 'Failed to create product.', details: error.message }, { status: 500 });
    }
}