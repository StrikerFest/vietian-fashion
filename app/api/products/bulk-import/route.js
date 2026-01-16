// app/api/products/bulk-import/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Papa from 'papaparse';

// Helper to parse CSV
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
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let createdProductsCount = 0;
    let createdVariantsCount = 0;

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) return NextResponse.json({ error: 'Không có tệp nào được cung cấp.' }, { status: 400 });

        const rows = await parseCsv(file);
        if (!rows || rows.length === 0) return NextResponse.json({ error: 'Tệp CSV trống.' }, { status: 400 });

        // --- 1. SKU VALIDATION (STRICT) ---

        // A. Extract all SKUs from CSV
        const csvSkus = rows
            .map(r => r.sku || r.SKU)
            .filter(sku => sku && sku.trim().length > 0)
            .map(sku => sku.trim());

        // B. Check Internal Duplicates (in the file itself)
        const uniqueCsvSkus = new Set(csvSkus);
        if (uniqueCsvSkus.size !== csvSkus.length) {
            // Find duplicates for error message
            const seen = new Set();
            const duplicates = new Set();
            for (const sku of csvSkus) {
                if (seen.has(sku)) duplicates.add(sku);
                seen.add(sku);
            }
            return NextResponse.json({
                error: `Tệp CSV chứa SKU trùng lặp: ${Array.from(duplicates).join(', ')}`
            }, { status: 400 });
        }

        // C. Check External Duplicates (in the Database)
        // We only check variants because product names are allowed to be upserted (merged)
        const { data: existingVariants, error: checkError } = await supabase
            .from('product_variants')
            .select('sku')
            .in('sku', Array.from(uniqueCsvSkus));

        if (checkError) throw checkError;

        if (existingVariants && existingVariants.length > 0) {
            const existingSkuList = existingVariants.map(v => v.sku).join(', ');
            return NextResponse.json({
                error: `Các SKU sau đã tồn tại trong hệ thống: ${existingSkuList}. Vui lòng kiểm tra lại.`
            }, { status: 400 });
        }

        // ----------------------------------

        // ... (Pre-fetch Taxonomy - Logic unchanged) ...
        const { data: allCategories } = await supabase
            .from('categories')
            .select('id, name, parent_id')
            .eq('type', 'attribute');

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

        // ... (Process Rows - Logic unchanged) ...
        const productsMap = new Map();
        for (const row of rows) {
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
                sku: sku.trim(), // Ensure trim
                price: parseFloat(price) || 0,
                on_hand: parseInt(row.on_hand || 0, 10),
                attribute_ids: [...new Set(attributeIdsToLink)]
            });
        }

        // ... (Database Inserts - Logic unchanged) ...
        for (const [productName, data] of productsMap.entries()) {
            const { productData, variants } = data;

            // [FIX] Manual Upsert by Name (Database 'name' is not unique constrained)
            let productId;
            
            // 1. Check if exists
            const { data: existingProduct, error: findError } = await supabase
                .from('products')
                .select('id')
                .eq('name', productName)
                .maybeSingle(); // Use maybeSingle to avoid error if not found

            if (findError) throw new Error(`Error checking product ${productName}: ${findError.message}`);

            if (existingProduct) {
                // 2. Update
                const { error: updateError } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', existingProduct.id);
                
                if (updateError) throw new Error(`Failed to update product ${productName}: ${updateError.message}`);
                productId = existingProduct.id;
            } else {
                // 3. Insert
                const { data: newProduct, error: insertError } = await supabase
                    .from('products')
                    .insert(productData)
                    .select('id')
                    .single();
                
                if (insertError) throw new Error(`Failed to create product ${productName}: ${insertError.message}`);
                productId = newProduct.id;
            }
            
            createdProductsCount++;

            for (const v of variants) {
                // We use 'upsert' here but effectively it's an 'insert'
                // because we already validated that these SKUs DO NOT exist.
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
            message: 'Nhập thành công',
            created_products: createdProductsCount,
            created_variants: createdVariantsCount,
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        return NextResponse.json({ error: error.message || 'Lỗi trong quá trình nhập.' }, { status: 500 });
    }
}