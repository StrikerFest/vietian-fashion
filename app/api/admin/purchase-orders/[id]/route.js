// app/api/admin/purchase-orders/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { updateInventory } from '@/utils/inventory'; // --- NEW ---
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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

    // We need the session to log WHO received the stock
    const cookieStore = cookies();
    const authSupabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await authSupabase.auth.getSession();

    try {
        // 1. Fetch current PO to check status
        const { data: currentPO, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (currentPO.status === 'received' && status === 'received') {
            return NextResponse.json({ error: 'Order is already received.' }, { status: 400 });
        }

        // 2. If marking as RECEIVED, update inventory using helper
        if (status === 'received') {
            const { data: items, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('variant_id, quantity')
                .eq('purchase_order_id', id);

            if (itemsError) throw itemsError;

            for (const item of items) {
                // --- MODIFIED: Use updateInventory ---
                await updateInventory(supabase, {
                    variantId: item.variant_id,
                    quantityChange: item.quantity, // Positive to add stock
                    reason: `Purchase Order #${id} received`,
                    userId: session?.user?.id || null
                });
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
        const { data: po, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (po.status === 'received') {
            return NextResponse.json({ error: 'Cannot delete a received order.' }, { status: 400 });
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