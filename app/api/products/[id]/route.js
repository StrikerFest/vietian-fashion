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
            product_variants (*, inventory_levels (*)),
            categories:product_categories ( category:categories(*) ),
            collections (id, name)
        `)
        .eq('id', numericProductId)
        .is('deleted_at', null)
        .single();

    if (error || !data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

    const formatted = {
        ...data,
        catalog_categories: data.categories.map(c => c.category).filter(c => c.type === 'catalog'),
        attributes: data.categories.map(c => c.category).filter(c => c.type === 'attribute'),
        categories: undefined
    };

    return NextResponse.json(formatted);
}

export async function PUT(request, context) {
    const { id } = await context.params;
    const numericProductId = parseInt(id);

    const {
        name, description, seo_title, seo_description, variants,
        attribute_ids = [], category_id, collection_ids = []
    } = await request.json();

    try {
        // 1. Update Product
        await supabase.from('products').update({ name, description, seo_title, seo_description }).eq('id', numericProductId);

        // 2. Upsert Variants
        const variantsToUpsert = variants.map(v => ({ sku: v.sku, price: v.price, size: v.size, color: v.color, product_id: numericProductId }));
        const { data: upsertedVariants } = await supabase.from('product_variants').upsert(variantsToUpsert, { onConflict: 'sku' }).select();

        // 3. Update Inventory
        const inventoryToUpsert = variants.map(v => {
            const dbVariant = upsertedVariants.find(dv => dv.sku === v.sku);
            return { variant_id: dbVariant.id, on_hand: v.on_hand || 0 };
        });
        await supabase.from('inventory_levels').upsert(inventoryToUpsert, { onConflict: 'variant_id' });

        // 4. Clear & Re-insert Relationships
        await supabase.from('product_collections').delete().eq('product_id', numericProductId);
        await supabase.from('product_categories').delete().eq('product_id', numericProductId);

        if (collection_ids.length > 0) {
            await supabase.from('product_collections').insert(collection_ids.map(cid => ({ product_id: numericProductId, collection_id: cid })));
        }

        const cats = [];
        if (category_id) cats.push({ product_id: numericProductId, category_id: category_id });
        attribute_ids.forEach(aid => { if (parseInt(aid) !== parseInt(category_id)) cats.push({ product_id: numericProductId, category_id: aid }); });
        if (cats.length > 0) await supabase.from('product_categories').insert(cats);

        return NextResponse.json({ message: 'Updated successfully' });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    const { id } = await context.params;
    await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', parseInt(id));
    return NextResponse.json({ message: 'Archived' });
}