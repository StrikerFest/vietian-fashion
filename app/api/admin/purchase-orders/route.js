// app/api/admin/purchase-orders/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all purchase orders
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
                id,
                created_at,
                status,
                order_date,
                expected_date,
                supplier_id,
                suppliers ( name, contact_person )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        return NextResponse.json({ error: 'Failed to fetch purchase orders.', details: error.message }, { status: 500 });
    }
}

// POST a new purchase order
export async function POST(request) {
    const { supplier_id, order_date, expected_date, items } = await request.json();

    if (!supplier_id || !items || items.length === 0) {
        return NextResponse.json({ error: 'Supplier and items are required.' }, { status: 400 });
    }

    try {
        // 1. Create the Purchase Order
        const { data: newPO, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
                supplier_id,
                order_date: order_date || new Date().toISOString(),
                expected_date: expected_date || null,
                status: 'draft' // Default status
            })
            .select()
            .single();

        if (poError) throw poError;

        // 2. Create Purchase Order Items
        const itemsToInsert = items.map(item => ({
            purchase_order_id: newPO.id,
            variant_id: item.variant_id,
            quantity: parseInt(item.quantity),
            cost_price: parseFloat(item.cost_price) || 0
        }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(itemsToInsert);

        if (itemsError) {
            // Rollback: Delete the PO if adding items fails
            await supabase.from('purchase_orders').delete().eq('id', newPO.id);
            throw itemsError;
        }

        return NextResponse.json({ message: 'Purchase Order created successfully.', purchaseOrder: newPO }, { status: 201 });

    } catch (error) {
        console.error('Error creating purchase order:', error);
        return NextResponse.json({ error: 'Failed to create purchase order.', details: error.message }, { status: 500 });
    }
}