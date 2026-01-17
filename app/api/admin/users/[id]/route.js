// app/api/admin/users/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET single user details
export async function GET(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    if (!id) return NextResponse.json({ error: 'Yêu cầu ID người dùng' }, { status: 400 });

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                *,
                addresses (*),
                orders (
                    id, created_at, status, total_amount,
                    order_items ( count )
                )
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (error) throw error;
        if (!user) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });

        // Sort orders by date descending (latest first)
        if (user.orders) {
            user.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        return NextResponse.json(user);

    } catch (error) {
        console.error('Error fetching user details:', error);
        return NextResponse.json({ error: 'Lỗi tải chi tiết người dùng.', details: error.message }, { status: 500 });
    }
}

// DELETE (Archive) a user
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    if (!id) return NextResponse.json({ error: 'Yêu cầu ID người dùng' }, { status: 400 });

    try {
        // Soft Delete
        const { error } = await supabase
            .from('users')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Lưu trữ người dùng thành công.' });

    } catch (error) {
        console.error('Error archiving user:', error);
        return NextResponse.json({ error: 'Lưu trữ người dùng thất bại.', details: error.message }, { status: 500 });
    }
}
