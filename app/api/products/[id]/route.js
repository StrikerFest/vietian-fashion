// app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const { params } = await context;
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Product ID required' }, { status: 400 });
    }
    const numericProductId = parseInt(id);

    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variants (*, inventory_levels (*)),
            categories:product_categories (
                category:categories(*) 
            ),
            collections (id, name)
        `)
        .eq('id', numericProductId)
        .is('deleted_at', null)
        .single();

    if (error) {
        return NextResponse.json({ error: `Failed to fetch product: ${error.message}` }, { status: 500 });
    }
    if (!data) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Format response
    const formatted = {
        ...data,
        catalog_categories: data.categories.map(c => c.category).filter(c => c.type === 'catalog'),
        attributes: data.categories.map(c => c.category).filter(c => c.type === 'attribute'),
        categories: undefined
    };

    return NextResponse.json(formatted);
}

// DELETE (Archive) - Unchanged logic, just ensures soft delete
export async function DELETE(request, context) {
    const { params } = await context;
    const { id } = params;

    const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', parseInt(id));

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Archived' });
}

// PUT (Update)
export async function PUT(request, context) {
    const { params } = await context;
    const { id } = params;
    const numericProductId = parseInt(id);

    const {
        name,
        description,
        seo_title,
        seo_description,
        variants,
        attribute_ids = [],
        category_id,
        collection_ids = []
    } = await request.json();

    try {
        // 1. Update Product Basic Info
        await supabase.from('products').update({
            name, description, seo_title, seo_description
        }).eq('id', numericProductId);

        // 2. Update Variants (Upsert Logic - same as before)
        const variantsToUpsert = variants.map(v => ({
            sku: v.sku, price: v.price, size: v.size, color: v.color, product_id: numericProductId
        }));
        const { data: upsertedVariants, error: varError } = await supabase
            .from('product_variants')
            .upsert(variantsToUpsert, { onConflict: 'sku' })
            .select();

        if (varError) throw varError;

        const upsertedVariantIds = upsertedVariants.map(v => v.id);
        if (upsertedVariantIds.length > 0) {
            const { error: deleteError } = await supabase
                .from('product_variants')
                .delete()
                .eq('product_id', numericProductId)
                .not('id', 'in', `(${upsertedVariantIds.join(',')})`);
            if (deleteError) console.warn(`Could not delete old variants: ${deleteError.message}`);
        } else {
            const { error: deleteAllError } = await supabase
                .from('product_variants')
                .delete()
                .eq('product_id', numericProductId);
            if (deleteAllError) console.warn(`Could not delete all variants: ${deleteAllError.message}`);
        }

        // 3. Update Inventory
        const inventoryToUpsert = variants.map(v => {
            const dbVariant = upsertedVariants.find(dv => dv.sku === v.sku);
            return { variant_id: dbVariant.id, on_hand: v.on_hand || 0 };
        });
        await supabase.from('inventory_levels').upsert(inventoryToUpsert, { onConflict: 'variant_id' });

        // 4. Update Relationships
        // Clear old relationships
        await supabase.from('product_collections').delete().eq('product_id', numericProductId);
        await supabase.from('product_categories').delete().eq('product_id', numericProductId);

        // Insert new Collections
        if (collection_ids.length > 0) {
            const cols = collection_ids.map(cid => ({ product_id: numericProductId, collection_id: cid }));
            await supabase.from('product_collections').insert(cols);
        }

        // Insert new Categories (Catalog + Attributes)
        const cats = [];
        if (category_id) cats.push({ product_id: numericProductId, category_id: category_id });
        attribute_ids.forEach(aid => {
            if (parseInt(aid) !== parseInt(category_id)) {
                cats.push({ product_id: numericProductId, category_id: aid });
            }
        });
        if (cats.length > 0) {
            await supabase.from('product_categories').insert(cats);
        }

        return NextResponse.json({ message: 'Updated successfully' });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}