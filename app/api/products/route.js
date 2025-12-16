// app/api/products/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    // --- AUTH & SCOPE SETUP ---
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const scope = searchParams.get('scope'); // 'admin' or null

    // Default: Public View (Active Only)
    let statusFilter = ['active'];
    let isAdmin = false;

    // Admin View: Check Session
    if (scope === 'admin') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            statusFilter = ['active', 'draft', 'archived'];
            isAdmin = true; // Mark as admin request
        }
    }
    // ---------------------------

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'created_at-desc';
    const collectionId = searchParams.get('collection_id');
    const categoryId = searchParams.get('category_id');

    const reservedParams = ['page', 'limit', 'search', 'sort', 'collection_id', 'category_id', 'scope'];
    const attributeFilters = {};

    searchParams.forEach((value, key) => {
        if (!reservedParams.includes(key)) {
            if (!attributeFilters[key]) attributeFilters[key] = [];
            attributeFilters[key].push(value);
        }
    });

    try {
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
            .is('deleted_at', null)
            .in('status', statusFilter);

        if (search) query = query.ilike('name', `%${search}%`);

        if (collectionId) {
            const { data: linked } = await supabase.from('product_collections').select('product_id').eq('collection_id', collectionId);
            query = query.in('id', linked?.map(p => p.product_id) || []);
        }

        if (categoryId) {
            const { data: linked } = await supabase.from('product_categories').select('product_id').eq('category_id', categoryId);
            query = query.in('id', linked?.map(p => p.product_id) || []);
        }

        if (Object.keys(attributeFilters).length > 0) {
            for (const [key, values] of Object.entries(attributeFilters)) {
                const { data: matchingVariants } = await supabase
                    .from('variant_attributes')
                    .select('variant_id, attribute_value:categories!inner(name)')
                    .in('attribute_value.name', values);

                if (matchingVariants && matchingVariants.length > 0) {
                    const variantIds = matchingVariants.map(v => v.variant_id);
                    const { data: productIds } = await supabase.from('product_variants').select('product_id').in('id', variantIds);
                    query = query.in('id', productIds?.map(p => p.product_id) || []);
                } else {
                    query = query.in('id', [-1]);
                }
            }
        }

        switch (sort) {
            case 'position-desc': query = query.order('position', { ascending: false }); break;
            case 'name-asc': query = query.order('name', { ascending: true }); break;
            case 'name-desc': query = query.order('name', { ascending: false }); break;
            case 'price-asc': query = query.order('name', { ascending: true }); break;
            default: query = query.order('created_at', { ascending: false });
        }

        query = query.range(offset, offset + limit - 1);
        const { data, error, count } = await query;
        if (error) throw error;

        const formattedData = data.map(product => ({
            ...product,
            catalog_categories: product.product_categories?.map(pc => pc.categories).filter(c => c.type === 'catalog') || [],
            attributes: product.product_categories?.map(pc => pc.categories).filter(c => c.type === 'attribute') || [],

            product_variants: product.product_variants.map(v => {
                const attributes = {};
                const attribute_value_ids = [];

                v.variant_attributes?.forEach(va => {
                    if (va.attribute_value) {
                        attribute_value_ids.push(va.attribute_value.id);

                        if (va.attribute_value.parent?.name) {
                            attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                        }
                    }
                });

                const realStock = v.inventory_levels?.[0]?.on_hand || 0;
                const { inventory_levels, ...safeVariant } = v;

                if (isAdmin) {
                    return {
                        ...v,
                        attributes,
                        attribute_value_ids,
                        inventory_levels: v.inventory_levels,
                        on_hand: realStock
                    };
                }

                return {
                    ...safeVariant,
                    attributes,
                    attribute_value_ids,
                    in_stock: realStock > 0,
                    low_stock: realStock > 0 && realStock <= 10,
                    stock_display: realStock > 10 ? 10 : realStock
                };
            }),
            product_categories: undefined
        }));

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
        attribute_ids = [], category_id, collection_ids = [], position = 0, status
    } = await request.json();

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    let newId = null;
    try {
        // --- 1. SKU VALIDATION ---
        const skuList = variants.map(v => v.sku);

        // A. Check for duplicates internally in request
        const uniqueSkus = new Set(skuList);
        if (uniqueSkus.size !== skuList.length) {
            return NextResponse.json({ error: 'Danh sách biến thể chứa SKU trùng lặp.' }, { status: 400 });
        }

        // B. Check for existing SKUs in Database
        const { data: existingSkus, error: skuCheckError } = await supabase
            .from('product_variants')
            .select('sku')
            .in('sku', skuList);

        if (skuCheckError) throw skuCheckError;

        if (existingSkus && existingSkus.length > 0) {
            const duplicates = existingSkus.map(item => item.sku).join(', ');
            return NextResponse.json({ error: `SKU đã tồn tại trong hệ thống: ${duplicates}` }, { status: 400 });
        }
        // -------------------------

        const { data: product, error: pErr } = await supabase.from('products')
            .insert([{
                name, description, image_url, seo_title, seo_description, position,
                status: status || 'draft'
            }]).select().single();

        if (pErr) throw pErr;
        newId = product.id;

        for (const v of variants) {
            const { data: newVar, error: vErr } = await supabase.from('product_variants')
                .insert({ product_id: newId, sku: v.sku, price: v.price })
                .select().single();

            if (vErr) throw vErr;
            await supabase.from('inventory_levels').insert({ variant_id: newVar.id, on_hand: v.on_hand ?? 0 });

            if (v.attribute_value_ids && Array.isArray(v.attribute_value_ids)) {
                const attrInserts = v.attribute_value_ids.map(catId => ({
                    variant_id: newVar.id, attribute_value_id: catId
                }));
                if (attrInserts.length > 0) await supabase.from('variant_attributes').insert(attrInserts);
            }
        }

        if (collection_ids.length) await supabase.from('product_collections').insert(collection_ids.map(cid => ({ product_id: newId, collection_id: cid })));

        const cats = [];
        if (category_id) cats.push({ product_id: newId, category_id });
        attribute_ids.forEach(aid => { if (parseInt(aid) !== parseInt(category_id)) cats.push({ product_id: newId, category_id: aid }); });
        if (cats.length) await supabase.from('product_categories').insert(cats);

        return NextResponse.json(product);
    } catch (error) {
        if (newId) await supabase.from('products').delete().eq('id', newId);
        return NextResponse.json({ error: error.message || 'Tạo sản phẩm thất bại.' }, { status: 500 });
    }
}