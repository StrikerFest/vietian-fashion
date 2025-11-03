// app/api/products/bulk-export/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //
import Papa from 'papaparse'; // Use papaparse to convert JSON to CSV

export async function GET() {
    try {
        // --- 1. Fetch all product data with variants and inventory ---
        const { data: products, error } = await supabase
            .from('products') //
            .select(`
                *,
                product_variants (
                    *,
                    inventory_levels (*)
                )
            `)
            .order('name', { ascending: true });

        if (error) throw error;

        // --- 2. Flatten the data into the desired CSV structure ---
        // (One row per variant)
        const flattenedData = [];
        for (const product of products) {
            if (!product.product_variants || product.product_variants.length === 0) {
                // Optionally include products with no variants, though less common
                continue;
            }

            for (const variant of product.product_variants) {
                flattenedData.push({
                    'product_name': product.name,
                    'description': product.description || '',
                    'seo_title': product.seo_title || '', //
                    'seo_description': product.seo_description || '', //
                    'sku': variant.sku, //
                    'price': variant.price, //
                    'size': variant.size, //
                    'color': variant.color, //
                    'on_hand': variant.inventory_levels?.[0]?.on_hand ?? 0, //
                });
            }
        }

        // --- 3. Convert the flattened JSON to a CSV string ---
        const csv = Papa.unparse(flattenedData, {
            header: true,
        });

        // --- 4. Return the CSV as a downloadable file ---
        const headers = new Headers();
        headers.set('Content-Type', 'text/csv');
        headers.set('Content-Disposition', 'attachment; filename="products_export.csv"');

        return new Response(csv, { headers });

    } catch (error) {
        console.error('Error exporting products:', error);
        return NextResponse.json({ error: 'Failed to export products.', details: error.message }, { status: 500 });
    }
}