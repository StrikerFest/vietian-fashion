// app/api/products/bulk-export/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //
import Papa from 'papaparse'; // Use papaparse to convert JSON to CSV

export async function GET(request) { // Add 'request' parameter
    try {
        // --- NEW: Check for selective export IDs ---
        const { searchParams } = new URL(request.url);
        const idsQuery = searchParams.get('ids'); // e.g., "1,2,3"

        let idArray = null;
        if (idsQuery) {
            idArray = idsQuery.split(',')
                             .map(id => parseInt(id.trim(), 10)) // Convert to numbers
                             .filter(id => !isNaN(id)); // Filter out any invalid numbers
        }

        // --- 1. MODIFIED: Fetch product data ---
        let query = supabase
            .from('products') //
            .select(`
                *,
                product_variants (
                    *,
                    inventory_levels (*)
                )
            `)
            .order('name', { ascending: true });

        // --- NEW: Apply ID filter if 'ids' are provided ---
        if (idArray && idArray.length > 0) {
            query = query.in('id', idArray); //
        }

        // Execute the query
        const { data: products, error } = await query;

        if (error) throw error;

        if (!products || products.length === 0) {
            // This case is not an error, just an empty export
            return NextResponse.json({ message: "No products found to export." }, { status: 200 });
        }

        // --- 2. Flatten the data into the desired CSV structure (unchanged) ---
        const flattenedData = [];
        for (const product of products) {
            if (!product.product_variants || product.product_variants.length === 0) {
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
        // The filename here is a fallback; the frontend logic dictates the final filename
        headers.set('Content-Disposition', 'attachment; filename="products_export.csv"');

        return new Response(csv, { headers });

    } catch (error) {
        console.error('Error exporting products:', error);
        return NextResponse.json({ error: 'Failed to export products.', details: error.message }, { status: 500 });
    }
}