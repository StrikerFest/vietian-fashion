// app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const { id } = await context.params;
    const numericProductId = parseInt(id);

    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            collections (id, name),
            categories:product_categories ( category:categories(*) ),
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

    if (error || !data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

    // Transform for Frontend
    const formatted = {
        ...data,
        catalog_categories: data.categories.map(c => c.category).filter(c => c.type === 'catalog'),
        attributes: data.categories.map(c => c.category).filter(c => c.type === 'attribute'),
        product_variants: data.product_variants.map(v => {
            const attributes = {};
            const attribute_value_ids = [];
            v.variant_attributes?.forEach(va => {
                if (va.attribute_value?.parent?.name) {
                    attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                    attribute_value_ids.push(va.attribute_value.id);
                }
            });
            return { ...v, attributes, attribute_value_ids };
        }),
        categories: undefined
    };

    return NextResponse.json(formatted);
}

export async function PUT(request, context) {
    const { id } = await context.params;
    const numericProductId = parseInt(id);

    const {
        name, description, seo_title, seo_description, variants,
        attribute_ids = [], category_id, collection_ids = [], position
    } = await request.json();

    try {
        // 1. Update Product
        const updateData = { name, description, seo_title, seo_description };
        if (position !== undefined) updateData.position = parseInt(position);
        await supabase.from('products').update(updateData).eq('id', numericProductId);

        // 2. Sync Variants (Complex)
        // For simplicity in this MVP refactor, we fetch existing, update matches, insert new.
        // A simpler strategy is often: Upsert variants, then sync attributes.

        for (const v of variants) {
            // Upsert Variant
            const { data: upsertedVar, error: vErr } = await supabase.from('product_variants')
                .upsert({
                    id: v.id, // Include ID if updating
                    product_id: numericProductId,
                    sku: v.sku,
                    price: v.price,
                    size: v.size || null,
                    color: v.color || null
                }, { onConflict: 'id' }) // If no ID, it generates new? No, SKU is usually unique.
                // Better to use SKU conflict if ID is missing, but ID is safer for edits.
                .select()
                .single();

            if (vErr) throw vErr;

            // Update Inventory
            await supabase.from('inventory_levels')
                .upsert({ variant_id: upsertedVar.id, on_hand: v.on_hand || 0 }, { onConflict: 'variant_id' });

            // Sync Attributes (Delete all, re-insert selected)
            if (v.attribute_value_ids && Array.isArray(v.attribute_value_ids)) {
                await supabase.from('variant_attributes').delete().eq('variant_id', upsertedVar.id);

                const attrInserts = v.attribute_value_ids.map(catId => ({
                    variant_id: upsertedVar.id,
                    attribute_value_id: catId
                }));
                if (attrInserts.length > 0) {
                    await supabase.from('variant_attributes').insert(attrInserts);
                }
            }
        }

        // 3. Sync Taxonomy
        await supabase.from('product_collections').delete().eq('product_id', numericProductId);
        await supabase.from('product_categories').delete().eq('product_id', numericProductId);

        if (collection_ids.length) await supabase.from('product_collections').insert(collection_ids.map(cid => ({ product_id: numericProductId, collection_id: cid })));

        const cats = [];
        if (category_id) cats.push({ product_id: numericProductId, category_id });
        attribute_ids.forEach(aid => { if (parseInt(aid) !== parseInt(category_id)) cats.push({ product_id: numericProductId, category_id: aid }); });
        if (cats.length) await supabase.from('product_categories').insert(cats);

        return NextResponse.json({ message: 'Updated successfully' });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE remains unchanged
export async function DELETE(request, context) {
    const { id } = await context.params;
    await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', parseInt(id));
    return NextResponse.json({ message: 'Archived' });
}