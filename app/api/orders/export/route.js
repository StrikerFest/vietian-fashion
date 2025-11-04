// app/api/orders/export/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //
import Papa from 'papaparse'; // We're using this for JSON -> CSV conversion

export async function GET(request) {
    try {
        // --- 1. Get and Validate Filters ---
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start');
        const endDate = searchParams.get('end');
        const status = searchParams.get('status');

        // --- 2. Build the Supabase Query ---
        let query = supabase
            .from('orders') //
            .select(`
                id,
                created_at,
                status,
                subtotal,
                total_amount,
                shipping_carrier,
                tracking_number,
                users ( email ),
                addresses ( address_line_1, address_line_2, city, state_province_region, postal_code, country ),
                order_discounts ( discounts ( code, type, value ) ),
                order_items (
                    quantity,
                    price_at_purchase,
                    product_variants (
                        sku,
                        size,
                        color,
                        products ( name )
                    )
                )
            `) // This is a complex join fetching all related data
            .order('created_at', { ascending: false });

        // Apply filters if they exist
        if (startDate) {
            query = query.gte('created_at', startDate); //
        }
        if (endDate) {
            query = query.lte('created_at', endDate); //
        }
        if (status) {
            query = query.eq('status', status); //
        }

        const { data: orders, error } = await query;

        if (error) throw error;

        if (!orders || orders.length === 0) {
            // Return an empty CSV with headers if no orders match
            const csv = Papa.unparse([], { header: true });
            const headers = new Headers();
            headers.set('Content-Type', 'text/csv');
            headers.set('Content-Disposition', 'attachment; filename="orders_export_empty.csv"');
            return new Response(csv, { headers });
        }

        // --- 3. Flatten the Data (one row per line item) ---
        const flattenedData = [];
        for (const order of orders) {
            const discount = order.order_discounts?.[0]?.discounts; //
            const address = order.addresses; //

            // Base data for each item in this order
            const baseOrderData = {
                'order_id': order.id,
                'order_date': order.created_at,
                'order_status': order.status,
                'customer_email': order.users?.email || 'Guest',
                'order_subtotal': order.subtotal,
                'order_total': order.total_amount,
                'discount_code': discount?.code || '',
                'shipping_carrier': order.shipping_carrier || '',
                'tracking_number': order.tracking_number || '',
                'shipping_address_1': address?.address_line_1 || '',
                'shipping_address_2': address?.address_line_2 || '',
                'shipping_city': address?.city || '',
                'shipping_state': address?.state_province_region || '',
                'shipping_postal_code': address?.postal_code || '',
                'shipping_country': address?.country || '',
            };

            if (order.order_items && order.order_items.length > 0) {
                // Create a row for each line item
                for (const item of order.order_items) {
                    flattenedData.push({
                        ...baseOrderData,
                        'line_item_sku': item.product_variants?.sku || 'N/A', //
                        'line_item_product_name': item.product_variants?.products?.name || 'N/A', //
                        'line_item_variant': `${item.product_variants?.color || 'N/A'} / ${item.product_variants?.size || 'N/A'}`,
                        'line_item_quantity': item.quantity, //
                        'line_item_price_at_purchase': item.price_at_purchase, //
                    });
                }
            } else {
                // If an order somehow has no items, add one row for the order itself
                flattenedData.push({
                    ...baseOrderData,
                    'line_item_sku': 'N/A',
                    'line_item_product_name': 'N/A',
                    'line_item_variant': 'N/A',
                    'line_item_quantity': 0,
                    'line_item_price_at_purchase': 0,
                });
            }
        }

        // --- 4. Convert flattened JSON to CSV string ---
        const csv = Papa.unparse(flattenedData, {
            header: true, // Automatically use object keys as headers
        });

        // --- 5. Return the CSV as a downloadable file ---
        const headers = new Headers();
        headers.set('Content-Type', 'text/csv');
        headers.set('Content-Disposition', `attachment; filename="orders_export_${new Date().toISOString().split('T')[0]}.csv"`);

        return new Response(csv, { headers });

    } catch (error) {
        console.error('Error exporting orders:', error);
        return NextResponse.json({ error: 'Failed to export orders.', details: error.message }, { status: 500 });
    }
}