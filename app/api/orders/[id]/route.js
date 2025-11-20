// app/api/orders/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { updateInventory } from '@/utils/inventory'; // --- NEW ---

// PUT (update) a single order
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    const { shipping_carrier, tracking_number, status } = body;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Order ID is required.' }, { status: 400 });
    }
    const numericOrderId = parseInt(id);

    try {
        // --- BRANCH 1: Handle Order Cancellation ---
        if (status === 'cancelled') {

            // 1. Get the order and its items
            const { data: order, error: fetchError } = await supabase
                .from('orders')
                .select(`
                    status,
                    user_id, 
                    order_items ( variant_id, quantity )
                `)
                .eq('id', numericOrderId)
                .single();

            if (fetchError) throw new Error(`Order not found: ${fetchError.message}`);

            if (order.status === 'cancelled' || order.status === 'delivered') {
                return NextResponse.json({ error: `Cannot cancel an order that is already ${order.status}.` }, { status: 400 });
            }

            // 2. Restock inventory using helper
            if (order.order_items && order.order_items.length > 0) {
                for (const item of order.order_items) {
                    // --- MODIFIED: Use updateInventory ---
                    await updateInventory(supabase, {
                        variantId: item.variant_id,
                        quantityChange: item.quantity, // Positive to restock
                        reason: `Order #${numericOrderId} cancelled`,
                        userId: order.user_id // Log the user if available
                    });
                }
            }

            // 3. Update the order status
            const { data: updatedOrder, error: orderUpdateError } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', numericOrderId)
                .select()
                .single();

            if (orderUpdateError) throw orderUpdateError;

            return NextResponse.json({ message: 'Order cancelled and inventory restocked.', order: updatedOrder });

            // --- BRANCH 2: Handle Shipping Update ---
        } else if (shipping_carrier !== undefined || tracking_number !== undefined) {

            const updateData = {};
            if (shipping_carrier !== undefined) updateData.shipping_carrier = shipping_carrier || null;
            if (tracking_number !== undefined) updateData.tracking_number = tracking_number || null;

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

            return NextResponse.json({ message: 'Order shipping details updated successfully.', order: updatedOrder });
        }

        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

    } catch (error) {
        console.error(`Error updating order ${numericOrderId}:`, error);
        return NextResponse.json({ error: 'Failed to update order.', details: error.message }, { status: 500 });
    }
}