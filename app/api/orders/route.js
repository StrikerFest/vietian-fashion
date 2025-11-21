// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Filter (Optional, for future use or specific status filtering)
    const status = searchParams.get('status');

    try {
        let query = supabase
            .from('orders')
            .select(`
                id,
                created_at,
                subtotal, 
                total_amount,
                status,
                shipping_carrier,
                tracking_number,
                users ( id, first_name, last_name, email ),
                addresses ( * ),
                order_items (
                    quantity,
                    price_at_purchase,
                    product_variants (
                        id,
                        sku,
                        color,
                        size,
                        products ( name )
                    )
                ),
                order_discounts (
                    discounts ( code, type, value )
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(start, end);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return NextResponse.json({
            data,
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders.', details: error.message }, { status: 500 });
    }
}