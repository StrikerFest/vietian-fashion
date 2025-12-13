// app/api/account/addresses/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
        }

        // --- Soft Delete ---
        const { error } = await supabase
            .from('addresses')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) throw error;

        return NextResponse.json({ message: 'Xóa địa chỉ thành công' });
    } catch (error) {
        console.error('Error deleting address:', error);
        return NextResponse.json({ error: 'Xóa địa chỉ thất bại' }, { status: 500 });
    }
}