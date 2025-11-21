// app/api/returns/route.js
import { NextResponse } from 'next/server';
import { supabase as staticSupabase } from '@/lib/supabaseClient';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET all return requests (for Admin panel)
// @unchanged
export async function GET() {
    try {
        const { data, error } = await staticSupabase
            .from('return_requests')
            .select(`
                id,
                created_at,
                order_id,
                status,
                reason,
                admin_notes,
                orders ( id, created_at, total_amount ),
                users ( email, first_name, last_name ),
                return_items (
                    id,
                    quantity,
                    should_restock,
                    order_items (
                        price_at_purchase,
                        product_variants (
                            sku,
                            size,
                            color,
                            products ( name )
                        )
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);

    } catch (error) {
        console.error('Error fetching return requests:', error);
        return NextResponse.json({ error: 'Failed to fetch return requests.', details: error.message }, { status: 500 });
    }
}

// POST: Create a new return request (Customer)
export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        // 1. Auth Check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { order_id, items, reason } = body; // items = [{ order_item_id, quantity }]

        if (!order_id || !items || items.length === 0 || !reason) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        // 2. Verify Order Ownership
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, status')
            .eq('id', order_id)
            .eq('user_id', session.user.id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found or access denied.' }, { status: 404 });
        }

        if (order.status !== 'delivered') {
            // Optional: Allow returns only for delivered items
            // return NextResponse.json({ error: 'Only delivered orders can be returned.' }, { status: 400 });
        }

        // 3. Create Return Request Header
        const { data: returnRequest, error: createError } = await supabase
            .from('return_requests')
            .insert({
                order_id: order_id,
                user_id: session.user.id,
                reason: reason,
                status: 'pending'
            })
            .select()
            .single();

        if (createError) throw createError;

        // 4. Create Return Items
        const returnItemsData = items.map(item => ({
            return_request_id: returnRequest.id,
            order_item_id: item.order_item_id,
            quantity: item.quantity,
            should_restock: true // Default to true, admin can change
        }));

        const { error: itemsError } = await supabase
            .from('return_items')
            .insert(returnItemsData);

        if (itemsError) {
            // Rollback request if items fail (manual cleanup since no transactions in REST)
            await supabase.from('return_requests').delete().eq('id', returnRequest.id);
            throw itemsError;
        }

        return NextResponse.json({ success: true, message: 'Return requested successfully.', id: returnRequest.id });

    } catch (error) {
        console.error('Error creating return request:', error);
        return NextResponse.json({ error: 'Failed to create return request.', details: error.message }, { status: 500 });
    }
}