// app/api/admin/inventory/adjust/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { updateInventory } from '@/utils/inventory';

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        // Check Auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });

        const { variant_id, quantity_change, reason } = await request.json();

        if (!variant_id || !quantity_change || !reason) {
            return NextResponse.json({ error: 'Thiếu các trường bắt buộc.' }, { status: 400 });
        }

        const change = parseInt(quantity_change);
        if (change === 0) {
            return NextResponse.json({ error: 'Số lượng thay đổi không được bằng 0.' }, { status: 400 });
        }

        // Use the helper
        await updateInventory(supabase, {
            variantId: variant_id,
            quantityChange: change,
            reason: reason,
            userId: session.user.id
        });

        return NextResponse.json({ message: 'Điều chỉnh tồn kho thành công.' });

    } catch (error) {
        console.error('Adjustment error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}