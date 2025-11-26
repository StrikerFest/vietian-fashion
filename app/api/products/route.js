// app/api/products/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'created_at-desc';

    const collectionId = searchParams.get('collection_id');
    const categoryId = searchParams.get('category_id');

    try {
        // 1. Base Query
        let query = supabase
            .from('products')
            .select(`
                *, 
                collections (*), 
                product_categories (categories (id, name, slug, type)),
                product_variants (
                    *,
                    inventory_levels (*),
                    variant_attributes (
                        attribute_value:categories (
                            id, name, parent_id, 
                            parent:parent_id ( name )
                        )
                    )
                )
            `, { count: 'exact' })
            .is('deleted_at', null);

        // ... [Search & Filter Logic remains the same as previous turn] ...
        if (search) query = query.ilike('name', `%${search}%`);
        if (collectionId) {
            const { data: linked } = await supabase.from('product_collections').select('product_id').eq('collection_id', collectionId);
            query = query.in('id', linked?.map(p => p.product_id) || []);
        }
        if (categoryId) {
            const { data: linked } = await supabase.from('product_categories').select('product_id').eq('category_id', categoryId);
            query = query.in('id', linked?.map(p => p.product_id) || []);
        }

        // Sorting
        switch (sort) {
            case 'position-desc': query = query.order('position', { ascending: false }); break;
            case 'name-asc': query = query.order('name', { ascending: true }); break;
            case 'name-desc': query = query.order('name', { ascending: false }); break;
            case 'created_at-asc': query = query.order('created_at', { ascending: true }); break;
            default: query = query.order('created_at', { ascending: false });
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        // 2. Transform Data
        // We map the SQL join structure back into a simple "attributes" object for the frontend
        const formattedData = data.map(product => ({
            ...product,
            catalog_categories: product.product_categories?.map(pc => pc.categories).filter(c => c.type === 'catalog') || [],
            product_variants: product.product_variants.map(v => {
                const attributes = {};
                // Transform variant_attributes array into Key-Value pairs
                v.variant_attributes?.forEach(va => {
                    if (va.attribute_value?.parent?.name) {
                        // { "Color": "Red" }
                        attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                    }
                });
                return { ...v, attributes };
            }),
            // Clean up internal join props
            product_categories: undefined
        }));

        // Price Sort (In-Memory)
        if (sort === 'price-asc' || sort === 'price-desc') {
            formattedData.sort((a, b) => {
                const pA = a.product_variants?.[0]?.price || 0;
                const pB = b.product_variants?.[0]?.price || 0;
                return sort === 'price-asc' ? pA - pB : pB - pA;
            });
        }

        return NextResponse.json({
            data: formattedData,
            meta: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const {
        name, description, image_url, seo_title, seo_description, variants,
        attribute_ids = [], category_id, collection_ids = [], position = 0
    } = await request.json();

    if (!name || !variants || variants.length === 0) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    let newId = null;
    try {
        // 1. Insert Product
        const { data: product, error: pErr } = await supabase.from('products')
            .insert([{ name, description, image_url, seo_title, seo_description, position }]).select().single();
        if (pErr) throw pErr;
        newId = product.id;

        // 2. Insert Variants
        for (const v of variants) {
            // Insert basic variant info
            const { data: newVar, error: vErr } = await supabase.from('product_variants')
                .insert({
                    product_id: newId,
                    sku: v.sku,
                    price: v.price,
                    // We populate legacy columns if provided, just in case
                    size: v.size || null,
                    color: v.color || null
                })
                .select()
                .single();

            if (vErr) throw vErr;

            // Insert Inventory
            await supabase.from('inventory_levels').insert({ variant_id: newVar.id, on_hand: v.on_hand ?? 0 });

            // Insert Variant Attributes (The new table)
            // Expecting v.attribute_value_ids = [10, 20] (IDs of categories)
            if (v.attribute_value_ids && Array.isArray(v.attribute_value_ids)) {
                const attrInserts = v.attribute_value_ids.map(catId => ({
                    variant_id: newVar.id,
                    attribute_value_id: catId
                }));
                if (attrInserts.length > 0) {
                    await supabase.from('variant_attributes').insert(attrInserts);
                }
            }
        }

        // 3. Insert Taxonomy (Collections, Categories)
        if (collection_ids.length) await supabase.from('product_collections').insert(collection_ids.map(cid => ({ product_id: newId, collection_id: cid })));

        const cats = [];
        if (category_id) cats.push({ product_id: newId, category_id });
        attribute_ids.forEach(aid => { if (parseInt(aid) !== parseInt(category_id)) cats.push({ product_id: newId, category_id: aid }); });
        if (cats.length) await supabase.from('product_categories').insert(cats);

        return NextResponse.json(product);
    } catch (error) {
        if (newId) await supabase.from('products').delete().eq('id', newId);
        return NextResponse.json({ error: 'Failed to create product.', details: error.message }, { status: 500 });
    }
}