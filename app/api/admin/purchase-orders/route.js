// app/api/admin/purchase-orders/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const { supplier_id, order_date, expected_date, items } = await request.json();

    if (!supplier_id || !items || items.length === 0) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    try {
        const { data: newPO, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
                supplier_id,
                order_date: order_date || new Date().toISOString(),
                expected_date: expected_date || null,
                status: 'draft'
            })
            .select()
            .single();

        if (poError) throw poError;

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
            await supabase.from('purchase_orders').delete().eq('id', newPO.id);
            throw itemsError;
        }

        return NextResponse.json({ message: 'Đã tạo', purchaseOrder: newPO }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}