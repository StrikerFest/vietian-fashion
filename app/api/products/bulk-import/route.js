// app/api/products/bulk-import/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import Papa from 'papaparse';

async function parseCsv(file) {
    const text = await file.text();
    return new Promise((resolve, reject) => {
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error),
        });
    });
}

export async function POST(request) {
    let createdProductsCount = 0;
    let createdVariantsCount = 0;

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

        const rows = await parseCsv(file);
        if (!rows || rows.length === 0) return NextResponse.json({ error: 'CSV is empty.' }, { status: 400 });

        // 1. Pre-fetch All Taxonomy to map Text -> IDs efficiently
        // We need two maps: GroupName -> GroupID, and (GroupID + OptionName) -> OptionID
        const { data: allCategories } = await supabase
            .from('categories')
            .select('id, name, parent_id, type')
            .eq('type', 'attribute');

        const attributeGroups = allCategories?.filter(c => !c.parent_id) || [];
        const attributeOptions = allCategories?.filter(c => c.parent_id) || [];

        // Helper to find ID
        const findAttributeOptionId = (groupName, valueName) => {
            const group = attributeGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
            if (!group) return null;
            const option = attributeOptions.find(o => o.parent_id === group.id && o.name.toLowerCase() === valueName.toLowerCase());
            return option ? option.id : null;
        };

        // 2. Process Rows
        const productsMap = new Map();

        for (const row of rows) {
            const { product_name, sku, price, on_hand, size, color, dynamic_attributes } = row;
            if (!product_name || !sku || !price) continue;

            if (!productsMap.has(product_name)) {
                productsMap.set(product_name, {
                    productData: {
                        name: product_name,
                        description: row.description || null,
                        seo_title: row.seo_title || null,
                        seo_description: row.seo_description || null,
                        // Default position 0, status active (implied)
                    },
                    variants: [],
                });
            }

            // Parse Attributes
            const attributeIdsToLink = [];

            // A. Handle Explicit "dynamic_attributes" column (Format: "Material:Cotton;Fit:Slim")
            if (dynamic_attributes) {
                const pairs = dynamic_attributes.split(';');
                pairs.forEach(pair => {
                    const [group, val] = pair.split(':').map(s => s.trim());
                    if (group && val) {
                        const id = findAttributeOptionId(group, val);
                        if (id) attributeIdsToLink.push(id);
                    }
                });
            }

            // B. Handle Legacy Columns (Size/Color) - Map them to new system too!
            if (size) {
                const id = findAttributeOptionId('Size', size);
                if (id) attributeIdsToLink.push(id);
            }
            if (color) {
                const id = findAttributeOptionId('Color', color);
                if (id) attributeIdsToLink.push(id);
            }

            productsMap.get(product_name).variants.push({
                sku,
                price: parseFloat(price) || 0,
                size: size || null,
                color: color || null,
                on_hand: parseInt(on_hand, 10) || 0,
                attribute_ids: [...new Set(attributeIdsToLink)] // Dedupe
            });
        }

        // 3. Database Inserts
        for (const [productName, data] of productsMap.entries()) {
            const { productData, variants } = data;

            // Upsert Product
            const { data: product, error: productError } = await supabase
                .from('products')
                .upsert(productData, { onConflict: 'name' })
                .select('id')
                .single();

            if (productError) throw new Error(`Failed product ${productName}: ${productError.message}`);
            const productId = product.id;
            createdProductsCount++;

            // Process Variants
            for (const v of variants) {
                // Upsert Variant
                const { data: insertedVar, error: varError } = await supabase
                    .from('product_variants')
                    .upsert({
                        product_id: productId,
                        sku: v.sku,
                        price: v.price,
                        size: v.size,
                        color: v.color
                    }, { onConflict: 'sku' })
                    .select()
                    .single();

                if (varError) throw new Error(`Failed variant ${v.sku}: ${varError.message}`);
                createdVariantsCount++;

                // Upsert Inventory
                await supabase.from('inventory_levels')
                    .upsert({ variant_id: insertedVar.id, on_hand: v.on_hand }, { onConflict: 'variant_id' });

                // Sync Attributes (Delete old links for this variant, insert new)
                // Note: In a true bulk upsert, this might wipe existing attributes if not careful.
                // Assuming CSV is source of truth.
                if (v.attribute_ids.length > 0) {
                    // Clean existing
                    await supabase.from('variant_attributes').delete().eq('variant_id', insertedVar.id);

                    // Insert new
                    const links = v.attribute_ids.map(aid => ({
                        variant_id: insertedVar.id,
                        attribute_value_id: aid
                    }));
                    await supabase.from('variant_attributes').insert(links);
                }
            }
        }

        return NextResponse.json({
            message: 'Import successful',
            created_products: createdProductsCount,
            created_variants: createdVariantsCount,
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        return NextResponse.json({ error: 'Failed during import process.', details: error.message }, { status: 500 });
    }
}