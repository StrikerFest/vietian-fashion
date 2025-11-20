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
            complete: (results) => {
                resolve(results.data);
            },
            error: (error) => {
                reject(error);
            },
        });
    });
}

export async function POST(request) {
    let createdProductsCount = 0;
    let createdVariantsCount = 0;

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }

        const rows = await parseCsv(file);
        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'CSV file is empty or invalid.' }, { status: 400 });
        }

        const productsMap = new Map();

        for (const row of rows) {
            const { product_name, sku, price, on_hand, size, color } = row;
            if (!product_name || !sku || !price || !on_hand || !size || !color) {
                continue;
            }

            const { description, seo_title, seo_description } = row;

            if (!productsMap.has(product_name)) {
                productsMap.set(product_name, {
                    productData: {
                        name: product_name,
                        description: description || null,
                        seo_title: seo_title || null,
                        seo_description: seo_description || null,
                        status: 'draft',
                        deleted_at: null // --- NEW: Restore product if it was archived ---
                    },
                    variants: [],
                });
            }

            productsMap.get(product_name).variants.push({
                sku: sku,
                price: parseFloat(price) || 0,
                size: size,
                color: color,
                on_hand: parseInt(on_hand, 10) || 0,
            });
        }

        if (productsMap.size === 0) {
            return NextResponse.json({ error: 'No valid product rows found in CSV.' }, { status: 400 });
        }

        for (const [productName, data] of productsMap.entries()) {
            const { productData, variants } = data;

            const { data: product, error: productError } = await supabase
                .from('products')
                .upsert(productData, { onConflict: 'name' })
                .select('id')
                .single();

            if (productError) throw new Error(`Failed to create product ${productName}: ${productError.message}`);

            const productId = product.id;
            createdProductsCount++;

            const variantsToInsert = variants.map(v => ({
                product_id: productId,
                sku: v.sku,
                price: v.price,
                size: v.size,
                color: v.color,
            }));

            const { data: insertedVariants, error: variantError } = await supabase
                .from('product_variants')
                .upsert(variantsToInsert, { onConflict: 'sku' })
                .select('id, sku');

            if (variantError) throw new Error(`Failed to create variants for ${productName}: ${variantError.message}`);

            createdVariantsCount += insertedVariants.length;

            const skuToVariantIdMap = new Map(
                insertedVariants.map(v => [v.sku, v.id])
            );

            const inventoryToInsert = variants.map(v => ({
                variant_id: skuToVariantIdMap.get(v.sku),
                on_hand: v.on_hand,
                committed: 0
            }));

            const { error: inventoryError } = await supabase
                .from('inventory_levels')
                .upsert(inventoryToInsert, { onConflict: 'variant_id' });

            if (inventoryError) throw new Error(`Failed to update inventory for ${productName}: ${inventoryError.message}`);
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