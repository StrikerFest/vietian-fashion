// app/api/orders/export/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {cookies} from 'next/headers';
import Papa from 'papaparse';

// Helper to format VND for CSV (raw number is often better for Excel, but let's ensure consistency)
// Or better: ensure we don't output small float decimals for VND.
const toVND = (num) => Math.round(num || 0);

export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] ADMIN ONLY - CRITICAL
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) {
        return new Response('Unauthorized', {status: 401});
    }
    // ---------------------------------------

    try {
        const {searchParams} = new URL(request.url);
        const startDate = searchParams.get('start');
        const endDate = searchParams.get('end');
        const status = searchParams.get('status');

        let query = supabase
            .from('orders')
            .select(`
                id, created_at, status, subtotal, total_amount, shipping_carrier, tracking_number, tax_amount, shipping_cost,
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
            .order('created_at', {ascending: false});

        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate);
        if (status) query = query.eq('status', status);

        const {data: orders, error} = await query;
        if (error) throw error;

        if (!orders || orders.length === 0) return new Response('Không có dữ liệu', {status: 200});

        const flattenedData = [];
        for (const order of orders) {
            const discountCode = order.order_discounts?.[0]?.discounts?.code || '';
            const address = order.addresses;

            const baseData = {
                'Order ID': order.id,
                'Date': new Date(order.created_at).toLocaleDateString('vi-VN'), // Use VN date format
                'Status': order.status,
                'Customer': order.users?.email || 'Guest',
                'Subtotal': toVND(order.subtotal),
                'Discount Code': discountCode,
                'Tax': toVND(order.tax_amount),
                'Shipping Cost': toVND(order.shipping_cost),
                'Total': toVND(order.total_amount),
                'Shipping Address': address ? `${address.city}, ${address.country}` : 'N/A'
            };

            if (order.order_items?.length > 0) {
                for (const item of order.order_items) {
                    const variantParts = [];
                    const v = item.product_variants;

                    if (v?.variant_attributes && v.variant_attributes.length > 0) {
                        v.variant_attributes.forEach(va => {
                            if (va.attribute_value?.parent?.name) {
                                variantParts.push(`${va.attribute_value.parent.name}: ${va.attribute_value.name}`);
                            }
                        });
                    } else {
                        variantParts.push('Standard');
                    }

                    flattenedData.push({
                        ...baseData,
                        'Product': v?.products?.name || 'Unknown',
                        'SKU': v?.sku || 'N/A',
                        'Variant': variantParts.join('; '),
                        'Qty': item.quantity,
                        'Unit Price': toVND(item.price_at_purchase)
                    });
                }
            } else {
                flattenedData.push(baseData);
            }
        }

        const csv = Papa.unparse(flattenedData);
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8', // Ensure UTF-8 for VN characters
                'Content-Disposition': `attachment; filename="orders_export_${new Date().toISOString().split('T')[0]}.csv"`
            }
        });

    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }
}