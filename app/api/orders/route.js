// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all orders for the admin panel
export async function GET() {
    try {
        // --- Updated query to include discount information ---
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                created_at,
                subtotal, // Include subtotal
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
            `) // Added join for order_discounts -> discounts
            .order('created_at', { ascending: false }); // Show newest orders first

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders.', details: error.message }, { status: 500 });
    }
}