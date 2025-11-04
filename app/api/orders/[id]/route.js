// app/api/orders/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// PUT (update) a single order
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    // Destructure all possible fields from the body
    const { shipping_carrier, tracking_number, status } = body;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Order ID is required.' }, { status: 400 });
    }
    const numericOrderId = parseInt(id);

    try {
        // --- BRANCH 1: Handle Order Cancellation ---
        if (status === 'cancelled') {

            // 1. Get the order and its items to restock
            const { data: order, error: fetchError } = await supabase
                .from('orders') //
                .select(`
                    status,
                    order_items ( variant_id, quantity )
                `)
                .eq('id', numericOrderId) //
                .single();

            if (fetchError) throw new Error(`Order not found: ${fetchError.message}`);

            // 2. Check if order can be cancelled
            if (order.status === 'cancelled' || order.status === 'delivered') {
                return NextResponse.json({ error: `Cannot cancel an order that is already ${order.status}.` }, { status: 400 });
            }

            // 3. Restock inventory for each item in the order
            // IMPORTANT: This should be in a database transaction (RPC) for production.
            if (order.order_items && order.order_items.length > 0) {
                for (const item of order.order_items) {
                    // Fetch current inventory
                    const { data: inventory, error: invFetchError } = await supabase
                        .from('inventory_levels') //
                        .select('on_hand')
                        .eq('variant_id', item.variant_id) //
                        .single();

                    if (invFetchError) throw new Error(`Inventory not found for variant ${item.variant_id}: ${invFetchError.message}`);

                    // Calculate new stock (restock)
                    const newOnHand = (inventory?.on_hand || 0) + item.quantity;

                    // Update the inventory
                    const { error: invUpdateError } = await supabase
                        .from('inventory_levels') //
                        .update({ on_hand: newOnHand }) //
                        .eq('variant_id', item.variant_id); //

                    if (invUpdateError) throw new Error(`Failed to restock inventory for variant ${item.variant_id}: ${invUpdateError.message}`);
                }
            }

            // 4. Update the order status to "cancelled"
            const { data: updatedOrder, error: orderUpdateError } = await supabase
                .from('orders') //
                .update({ status: 'cancelled' }) //
                .eq('id', numericOrderId)
                .select() // Select the fully updated order
                .single();

            if (orderUpdateError) throw orderUpdateError;

            return NextResponse.json({ message: 'Order cancelled and inventory restocked.', order: updatedOrder });

        // --- BRANCH 2: Handle Shipping Update ---
        } else if (shipping_carrier !== undefined || tracking_number !== undefined) {

            const updateData = {};
            if (shipping_carrier !== undefined) {
                updateData.shipping_carrier = shipping_carrier || null; //
            }
            if (tracking_number !== undefined) {
                updateData.tracking_number = tracking_number || null; //
            }
            // Optionally, set status to 'shipped' if not already shipped
            // updateData.status = 'shipped';

            const { data: updatedOrder, error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', numericOrderId)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
                throw error;
            }
            if (!updatedOrder) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

            return NextResponse.json({ message: 'Order shipping details updated successfully.', order: updatedOrder });
        }

        // --- No valid action provided ---
        return NextResponse.json({ error: 'Invalid request. Must provide either "status" or shipping details.' }, { status: 400 });

    } catch (error) {
        console.error(`Error updating order ${numericOrderId}:`, error);
        return NextResponse.json({ error: 'Failed to update order.', details: error.message }, { status: 500 });
    }
}