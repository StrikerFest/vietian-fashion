import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
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
