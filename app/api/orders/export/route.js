// app/api/orders/export/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import Papa from 'papaparse';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start');
        const endDate = searchParams.get('end');
        const status = searchParams.get('status');

        let query = supabase
            .from('orders')
            .select(`
                id, created_at, status, subtotal, total_amount, shipping_carrier, tracking_number,
                users ( email ),
                addresses ( address_line_1, city, state_province_region, postal_code, country ),
                order_discounts ( discounts ( code ) ),
                order_items (
                    quantity, price_at_purchase,
                    product_variants (
                        sku, 
                        products ( name ),
                        variant_attributes (
                            attribute_value:categories ( 
                                name, 
                                parent:parent_id ( name ) 
                            )
                        )
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate);
        if (status) query = query.eq('status', status);

        const { data: orders, error } = await query;
        if (error) throw error;

        if (!orders || orders.length === 0) return new Response('No data', { status: 200 });

        const flattenedData = [];
        for (const order of orders) {
            const discountCode = order.order_discounts?.[0]?.discounts?.code || '';
            const address = order.addresses;

            const baseData = {
                'Order ID': order.id,
                'Date': new Date(order.created_at).toLocaleDateString(),
                'Status': order.status,
                'Customer': order.users?.email || 'Guest',
                'Total': order.total_amount,
                'Discount': discountCode,
                'Shipping': address ? `${address.city}, ${address.country}` : 'N/A'
            };

            if (order.order_items?.length > 0) {
                for (const item of order.order_items) {
                    // --- THE FIX: Build Dynamic Variant String ---
                    const variantParts = [];
                    const v = item.product_variants;

                    if (v?.variant_attributes && v.variant_attributes.length > 0) {
                        v.variant_attributes.forEach(va => {
                            if (va.attribute_value?.parent?.name) {
                                // e.g. "Color: Red"
                                variantParts.push(`${va.attribute_value.parent.name}: ${va.attribute_value.name}`);
                            }
                        });
                    } else {
                        // Very subtle fallback for pure SKU variants or data integrity issues
                        variantParts.push('Standard');
                    }

                    flattenedData.push({
                        ...baseData,
                        'Product': v?.products?.name || 'Unknown',
                        'SKU': v?.sku || 'N/A',
                        'Variant': variantParts.join('; '), // "Size: M; Color: Red"
                        'Qty': item.quantity,
                        'Unit Price': item.price_at_purchase
                    });
                }
            } else {
                flattenedData.push(baseData);
            }
        }

        const csv = Papa.unparse(flattenedData);
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="orders_export_${new Date().toISOString().split('T')[0]}.csv"`
            }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}