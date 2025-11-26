// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const status = searchParams.get('status');

    try {
        let query = supabase
            .from('orders')
            .select(`
                *,
                users ( id, first_name, last_name, email ),
                addresses ( * ),
                order_discounts ( discounts ( code, type, value ) ),
                order_items (
                    id, quantity, price_at_purchase,
                    product_variants (
                        id, sku, size, color,
                        products ( name ),
                        variant_attributes (
                            attribute_value:categories (
                                name, parent:parent_id ( name )
                            )
                        )
                    )
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(start, end);

        if (status) query = query.eq('status', status);

        const { data, error, count } = await query;
        if (error) throw error;

        // Transform nested attributes into a flat object for the frontend
        const formattedOrders = data.map(order => ({
            ...order,
            order_items: order.order_items.map(item => {
                const attributes = {};

                // 1. Map legacy columns (Backwards compatibility)
                if (item.product_variants?.size) attributes['Size'] = item.product_variants.size;
                if (item.product_variants?.color) attributes['Color'] = item.product_variants.color;

                // 2. Map dynamic attributes
                item.product_variants?.variant_attributes?.forEach(va => {
                    if (va.attribute_value?.parent?.name) {
                        attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                    }
                });

                return {
                    ...item,
                    product_variants: {
                        ...item.product_variants,
                        attributes // Inject the clean object
                    }
                };
            })
        }));

        return NextResponse.json({
            data: formattedOrders,
            meta: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) }
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders.', details: error.message }, { status: 500 });
    }
}