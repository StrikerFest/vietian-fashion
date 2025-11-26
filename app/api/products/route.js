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
        let query = supabase
            .from('products')
            .select(`
                *, 
                product_variants (*, inventory_levels (*)), 
                collections (*), 
                product_categories (categories (id, name, slug, type))
            `, { count: 'exact' })
            .is('deleted_at', null);

        // Search
        if (search) query = query.ilike('name', `%${search}%`);

        // Collection Widget Filter
        if (collectionId) {
            const { data: linked } = await supabase.from('product_collections').select('product_id').eq('collection_id', collectionId);
            query = query.in('id', linked?.map(p => p.product_id) || []);
        }

        // Category Widget Filter
        if (categoryId) {
            const { data: linked } = await supabase.from('product_categories').select('product_id').eq('category_id', categoryId);
            query = query.in('id', linked?.map(p => p.product_id) || []);
        }

        // Sort
        switch (sort) {
            case 'position-desc': query = query.order('position', { ascending: false }); break;
            case 'name-asc': query = query.order('name', { ascending: true }); break;
            case 'name-desc': query = query.order('name', { ascending: false }); break;
            case 'created_at-asc': query = query.order('created_at', { ascending: true }); break;
            default: query = query.order('created_at', { ascending: false });
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        const formattedData = data.map(product => ({
            ...product,
            catalog_categories: product.product_categories?.map(pc => pc.categories).filter(c => c.type === 'catalog') || [],
            attributes: product.product_categories?.map(pc => pc.categories).filter(c => c.type === 'attribute') || [],
            product_categories: undefined
        }));

        // Price Sort
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

// POST remains as updated in previous steps (with position support)
export async function POST(request) {
    const {
        name, description, image_url, seo_title, seo_description, variants,
        attribute_ids = [], category_id, collection_ids = [], position = 0
    } = await request.json();

    if (!name || !variants || variants.length === 0) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    let newId = null;
    try {
        const { data: product, error: pErr } = await supabase.from('products')
            .insert([{ name, description, image_url, seo_title, seo_description, position }]).select().single();
        if (pErr) throw pErr;
        newId = product.id;

        const vars = variants.map(v => ({ sku: v.sku, price: v.price, size: v.size, color: v.color, product_id: newId }));
        const { data: insertedVars, error: vErr } = await supabase.from('product_variants').insert(vars).select();
        if (vErr) throw vErr;

        const inv = insertedVars.map((v, i) => ({ variant_id: v.id, on_hand: variants[i].on_hand ?? 0 }));
        await supabase.from('inventory_levels').insert(inv);

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