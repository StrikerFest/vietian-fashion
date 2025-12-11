// app/api/products/bulk-import/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Use dynamic client
import { cookies } from 'next/headers';
import Papa from 'papaparse';

// ... (keep your parseCsv helper function) ...
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
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ----------------------------

    let createdProductsCount = 0;
    let createdVariantsCount = 0;

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

        const rows = await parseCsv(file);
        if (!rows || rows.length === 0) return NextResponse.json({ error: 'CSV is empty.' }, { status: 400 });

        // ... (The rest of your logic remains EXACTLY the same) ...
        // ... (1. Pre-fetch Taxonomy) ...
        const { data: allCategories } = await supabase
            .from('categories')
            .select('id, name, parent_id')
            .eq('type', 'attribute');

        // ... (Keep existing logic map/findAttributeId) ...
        const optionMap = new Map();
        allCategories?.forEach(cat => {
            if (cat.parent_id) {
                const parent = allCategories.find(p => p.id === cat.parent_id);
                if (parent) {
                    const key = `${parent.name.toLowerCase()}:${cat.name.toLowerCase()}`;
                    optionMap.set(key, cat.id);
                }
            }
        });

        const findAttributeId = (groupName, valueName) => {
            const key = `${groupName.toLowerCase()}:${valueName.toLowerCase()}`;
            return optionMap.get(key) || null;
        };

        // ... (2. Process Rows - Keep existing logic) ...
        const productsMap = new Map();
        for (const row of rows) {
            // ... (Keep your loop logic exactly as is) ...
            // (Copy the body of your loop from the original file)
            const productName = row.product_name || row.Name;
            const sku = row.sku || row.SKU;
            const price = row.price || row.Price;

            if (!productName || !sku || !price) continue;

            if (!productsMap.has(productName)) {
                productsMap.set(productName, {
                    productData: {
                        name: productName,
                        description: row.description || null,
                        seo_title: row.seo_title || null,
                        seo_description: row.seo_description || null,
                    },
                    variants: [],
                });
            }
            // ... (attribute parsing) ...
            const attrString = row.attributes || row.dynamic_attributes || "";
            const attributeIdsToLink = [];
            if (attrString) {
                const pairs = attrString.split(';');
                pairs.forEach(pair => {
                    const parts = pair.split(':');
                    if (parts.length === 2) {
                        const group = parts[0].trim();
                        const val = parts[1].trim();
                        const id = findAttributeId(group, val);
                        if (id) attributeIdsToLink.push(id);
                    }
                });
            }
            productsMap.get(productName).variants.push({
                sku,
                price: parseFloat(price) || 0,
                on_hand: parseInt(row.on_hand || 0, 10),
                attribute_ids: [...new Set(attributeIdsToLink)]
            });
        }

        // ... (3. Database Inserts - Keep existing logic) ...
        for (const [productName, data] of productsMap.entries()) {
            // ... (Upsert Product, Variants, Inventory, Attributes) ...
            // (Use the 'supabase' client we created at the top)
            const { productData, variants } = data;

            const { data: product, error: productError } = await supabase
                .from('products')
                .upsert(productData, { onConflict: 'name' })
                .select('id')
                .single();

            if (productError) throw new Error(`Failed product ${productName}: ${productError.message}`);
            const productId = product.id;
            createdProductsCount++;

            for (const v of variants) {
                const { data: insertedVar, error: varError } = await supabase
                    .from('product_variants')
                    .upsert({
                        product_id: productId,
                        sku: v.sku,
                        price: v.price
                    }, { onConflict: 'sku' })
                    .select().single();

                if (varError) throw new Error(`Failed variant ${v.sku}: ${varError.message}`);
                createdVariantsCount++;

                await supabase.from('inventory_levels')
                    .upsert({ variant_id: insertedVar.id, on_hand: v.on_hand }, { onConflict: 'variant_id' });

                if (v.attribute_ids.length > 0) {
                    await supabase.from('variant_attributes').delete().eq('variant_id', insertedVar.id);
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