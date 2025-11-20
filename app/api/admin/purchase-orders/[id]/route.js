// app/api/admin/purchase-orders/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET a single purchase order details
export async function GET(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                suppliers (*),
                purchase_order_items (
                    id, quantity, cost_price,
                    product_variants (
                        id, sku, size, color,
                        products ( name )
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching PO details:', error);
        return NextResponse.json({ error: 'Failed to fetch details.' }, { status: 500 });
    }
}

// PUT (Update Status)
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const { status } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        // 1. Fetch current PO to check status
        const { data: currentPO, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Prevent re-receiving
        if (currentPO.status === 'received' && status === 'received') {
            return NextResponse.json({ error: 'Order is already received.' }, { status: 400 });
        }

        // 2. If marking as RECEIVED, update inventory
        if (status === 'received') {
            // Fetch items
            const { data: items, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('variant_id, quantity')
                .eq('purchase_order_id', id);

            if (itemsError) throw itemsError;

            // Update inventory for each item
            for (const item of items) {
                // Get current inventory
                const { data: currentInv, error: invError } = await supabase
                    .from('inventory_levels')
                    .select('on_hand')
                    .eq('variant_id', item.variant_id)
                    .single();

                // If variant doesn't exist in inventory table yet, create it
                if (invError && invError.code === 'PGRST116') {
                    await supabase.from('inventory_levels').insert({
                        variant_id: item.variant_id,
                        on_hand: item.quantity
                    });
                } else if (currentInv) {
                    // Update existing
                    await supabase
                        .from('inventory_levels')
                        .update({ on_hand: currentInv.on_hand + item.quantity })
                        .eq('variant_id', item.variant_id);
                }
            }
        }

        // 3. Update PO status
        const { data: updatedPO, error: updateError } = await supabase
            .from('purchase_orders')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json(updatedPO);

    } catch (error) {
        console.error('Error updating PO:', error);
        return NextResponse.json({ error: 'Failed to update PO.', details: error.message }, { status: 500 });
    }
}

// DELETE a purchase order
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    try {
        // Check status before deleting
        const { data: po, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (po.status === 'received') {
            return NextResponse.json({ error: 'Cannot delete a received order. It has already affected inventory.' }, { status: 400 });
        }

        const { error: deleteError } = await supabase
            .from('purchase_orders')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ message: 'Purchase order deleted successfully.' });

    } catch (error) {
        console.error('Error deleting PO:', error);
        return NextResponse.json({ error: 'Failed to delete PO.', details: error.message }, { status: 500 });
    }
}