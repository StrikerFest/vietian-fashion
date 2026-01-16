// app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request, context) {
    const { id } = await context.params;
    const numericProductId = parseInt(id);

    // --- AUTH SETUP ---
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check if user is admin
    let isAdmin = false;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) isAdmin = true;

    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            collections (id, name),
            categories:product_categories ( category:categories(*) ),
            product_images (id, image_url, alt_text, is_primary),
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
        `)
        .eq('id', numericProductId)
        .is('deleted_at', null)
        .single();

    if (error || !data) return NextResponse.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });

    // --- SECURITY CHECK: DRAFT VISIBILITY ---
    if (data.status !== 'active' && !isAdmin) {
        return NextResponse.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });
    }

    // --- DATA TRANSFORMATION ---
    const formatted = {
        ...data,
        catalog_categories: data.categories.map(c => c.category).filter(c => c.type === 'catalog'),
        attributes: data.categories.map(c => c.category).filter(c => c.type === 'attribute'),
        // Sort images: Primary first, then others
        product_images: data.product_images?.sort((a, b) => (b.is_primary === a.is_primary) ? 0 : b.is_primary ? 1 : -1) || [],
        product_variants: data.product_variants.map(v => {
            const attributes = {};
            const attribute_value_ids = [];
            v.variant_attributes?.forEach(va => {
                if (va.attribute_value?.parent?.name) {
                    attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                    attribute_value_ids.push(va.attribute_value.id);
                }
            });

            // --- FIX: Handle 1:1 Relationship (Object) vs 1:N Relationship (Array) ---
            let stockData = v.inventory_levels;

            if (Array.isArray(stockData)) {
                stockData = stockData[0];
            }

            const realStock = stockData?.on_hand || 0;
            // -------------------------------------------------------------------------

            const { inventory_levels, ...safeVariant } = v;

            // FIX: Return raw stock for Admins
            if (isAdmin) {
                return {
                    ...v,
                    attributes,
                    attribute_value_ids,
                    inventory_levels: Array.isArray(v.inventory_levels) ? v.inventory_levels : [v.inventory_levels].filter(Boolean),
                    on_hand: realStock
                };
            }

            // PUBLIC View: Masking
            return {
                ...safeVariant,
                attributes,
                attribute_value_ids, // [FIX] Always return IDs for frontend logic
                in_stock: realStock > 0,
                low_stock: realStock > 0 && realStock <= 10,
                stock_display: realStock > 10 ? 10 : realStock
            };
        }),
        categories: undefined
    };

    return NextResponse.json(formatted);
}

export async function PUT(request, context) {
    const { id } = await context.params;
    const numericProductId = parseInt(id);

    // Use dynamic client for security
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const {
        name, description, status, image_url, images = [], seo_title, seo_description, variants,
        attribute_ids = [], category_id, collection_ids = [], position
    } = await request.json();

    try {
        // --- 1. SKU VALIDATION ---
        const skuList = variants.map(v => v.sku);

        // A. Check internal duplicates
        const uniqueSkus = new Set(skuList);
        if (uniqueSkus.size !== skuList.length) {
            return NextResponse.json({ error: 'Danh sách biến thể chứa SKU trùng lặp.' }, { status: 400 });
        }

        // B. Check for conflicts in Database
        const { data: conflictVariants, error: skuCheckError } = await supabase
            .from('product_variants')
            .select('id, sku, product_id')
            .in('sku', skuList);

        if (skuCheckError) throw skuCheckError;

        if (conflictVariants && conflictVariants.length > 0) {
            const duplicates = [];

            for (const conflict of conflictVariants) {
                const inputVariant = variants.find(v => v.sku === conflict.sku);

                if (inputVariant.id && inputVariant.id !== conflict.id) {
                    duplicates.push(conflict.sku);
                }
                else if (!inputVariant.id) {
                    duplicates.push(conflict.sku);
                }
            }

            if (duplicates.length > 0) {
                return NextResponse.json({ error: `SKU đã tồn tại (dùng cho sản phẩm khác hoặc biến thể khác): ${duplicates.join(', ')}` }, { status: 400 });
            }
        }
        // -------------------------

        const updateData = { name, description, status, image_url, seo_title, seo_description };

        if (position !== undefined) updateData.position = parseInt(position);

        const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', numericProductId);

        if (updateError) throw updateError;

        // --- 2. SYNC IMAGES (New Logic) ---
        await supabase.from('product_images').delete().eq('product_id', numericProductId);

        if (images && images.length > 0) {
            const imageInserts = images.map(img => ({
                product_id: numericProductId,
                image_url: img.image_url,
                is_primary: img.is_primary || false,
                alt_text: img.alt_text || name
            }));
            const { error: imgErr } = await supabase.from('product_images').insert(imageInserts);
            if (imgErr) throw imgErr;
        }

        // --- 3. SYNC VARIANTS ---
        for (const v of variants) {
            const { data: upsertedVar, error: vErr } = await supabase.from('product_variants')
                .upsert({
                    id: v.id,
                    product_id: numericProductId,
                    sku: v.sku,
                    price: v.price
                }, { onConflict: 'id' })
                .select()
                .single();

            if (vErr) throw vErr;

            await supabase.from('inventory_levels')
                .upsert({ variant_id: upsertedVar.id, on_hand: v.on_hand || 0 }, { onConflict: 'variant_id' });

            if (v.attribute_value_ids && Array.isArray(v.attribute_value_ids)) {
                await supabase.from('variant_attributes').delete().eq('variant_id', upsertedVar.id);

                const attrInserts = v.attribute_value_ids.map(catId => ({
                    variant_id: upsertedVar.id,
                    attribute_value_id: catId
                }));
                if (attrInserts.length > 0) await supabase.from('variant_attributes').insert(attrInserts);
            }
        }

        // --- 4. SYNC TAXONOMY ---
        await supabase.from('product_collections').delete().eq('product_id', numericProductId);
        await supabase.from('product_categories').delete().eq('product_id', numericProductId);

        if (collection_ids.length) await supabase.from('product_collections').insert(collection_ids.map(cid => ({ product_id: numericProductId, collection_id: cid })));

        const cats = [];
        if (category_id) cats.push({ product_id: numericProductId, category_id });
        attribute_ids.forEach(aid => {
            if (parseInt(aid) !== parseInt(category_id)) cats.push({ product_id: numericProductId, category_id: aid });
        });

        if (cats.length) await supabase.from('product_categories').insert(cats);

        return NextResponse.json({ message: 'Cập nhật thành công.' });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', parseInt(id));
    return NextResponse.json({ message: 'Đã lưu trữ.' });
}