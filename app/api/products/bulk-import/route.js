// app/api/products/bulk-import/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //
import Papa from 'papaparse'; // We installed this library

// Helper function to read the file stream and parse it
async function parseCsv(file) {
    const text = await file.text();
    return new Promise((resolve, reject) => {
        Papa.parse(text, {
            header: true,       // Use the first row as headers
            skipEmptyLines: true, // Skip empty rows
            complete: (results) => {
                resolve(results.data); // Return the array of row objects
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

        // --- 1. Parse the CSV file ---
        const rows = await parseCsv(file);
        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'CSV file is empty or invalid.' }, { status: 400 });
        }

        // --- 2. Group variants by product name ---
        // We use a Map to group all variants that belong to the same product.
        // This prevents us from creating the same product multiple times.
        const productsMap = new Map();

        for (const row of rows) {
            // Validate required columns for each row
            const { product_name, sku, price, on_hand, size, color } = row;
            if (!product_name || !sku || !price || !on_hand || !size || !color) {
                console.warn("Skipping row with missing required data:", row);
                continue; // Skip this invalid row
            }

            // Optional fields
            const { description, seo_title, seo_description } = row;

            // If this is the first time we see this product, create its entry
            if (!productsMap.has(product_name)) {
                productsMap.set(product_name, {
                    productData: {
                        name: product_name,
                        description: description || null,
                        seo_title: seo_title || null, //
                        seo_description: seo_description || null, //
                        status: 'draft' // Default to 'draft' status on import
                    },
                    variants: [],
                });
            }

            // Add the current row's variant data to its product entry
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

        // --- 3. Process each product and its variants ---
        // This is not a true transaction (if one product fails, others might succeed).
        // For a true "all or nothing" import, this logic should be moved
        // into a single Supabase RPC (database function) that takes the JSON.
        for (const [productName, data] of productsMap.entries()) {
            const { productData, variants } = data;

            // Step A: Create or update the product
            // `upsert` will find a product with this name or create a new one.
            const { data: product, error: productError } = await supabase
                .from('products') //
                .upsert(productData, { onConflict: 'name' }) // Use 'name' as the conflict target
                .select('id')
                .single();

            if (productError) throw new Error(`Failed to create product ${productName}: ${productError.message}`);

            // We need the product ID for the variants
            const productId = product.id;
            createdProductsCount++; // We'll count this even if it was just updated

            // Step B: Prepare variant and inventory data
            const variantsToInsert = variants.map(v => ({
                product_id: productId, //
                sku: v.sku, //
                price: v.price, //
                size: v.size, //
                color: v.color, //
            }));

            // Step C: Create or update the variants
            // `upsert` will find variants with matching SKUs or create new ones.
            const { data: insertedVariants, error: variantError } = await supabase
                .from('product_variants') //
                .upsert(variantsToInsert, { onConflict: 'sku' }) // Use 'sku' as conflict target
                .select('id, sku'); // Get the IDs and SKUs back

            if (variantError) throw new Error(`Failed to create variants for ${productName}: ${variantError.message}`);

            createdVariantsCount += insertedVariants.length;

            // Step D: Create a map of SKU -> variant_id from the results
            const skuToVariantIdMap = new Map(
                insertedVariants.map(v => [v.sku, v.id])
            );

            // Step E: Prepare inventory data
            const inventoryToInsert = variants.map(v => ({
                variant_id: skuToVariantIdMap.get(v.sku), // Link to the variant ID
                on_hand: v.on_hand, //
                committed: 0 // Default committed to 0
            }));

            // Step F: Create or update the inventory levels
            // `upsert` will find inventory by 'variant_id' or create a new entry
            const { error: inventoryError } = await supabase
                .from('inventory_levels') //
                .upsert(inventoryToInsert, { onConflict: 'variant_id' }); //

            if (inventoryError) throw new Error(`Failed to update inventory for ${productName}: ${inventoryError.message}`);
        }

        // --- 4. Return Success Summary ---
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