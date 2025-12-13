// app/api/discounts/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Switch to dynamic client
import { cookies } from 'next/headers';

// PUT (Update)
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ----------------------------

    const { code, type, value, start_date, end_date, is_active } = await request.json();

    // Validation logic
    if (!code || !type || value === undefined) {
        return NextResponse.json({ error: 'Code, Type, and Value are required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('discounts')
            .update({
                code: code.toUpperCase(),
                type,
                value,
                start_date: start_date || null,
                end_date: end_date || null,
                is_active,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            // Preserve your specific duplicate code check
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Mã giảm giá đã tồn tại.' }, { status: 409 });
            }
            throw error;
        }

        if (!data) {
            return NextResponse.json({ error: 'Không tìm thấy mã giảm giá.' }, { status: 404 });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error(`Error updating discount ${id}:`, error);
        return NextResponse.json({ error: 'Cập nhật mã giảm giá thất bại.', details: error.message }, { status: 500 });
    }
}

// DELETE (Archive)
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ----------------------------

    try {
        // Soft Delete
        const { error } = await supabase
            .from('discounts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Lưu trữ mã giảm giá thành công.' });

    } catch (error) {
        console.error(`Error archiving discount ${id}:`, error);
        return NextResponse.json({ error: 'Lưu trữ mã giảm giá thất bại.', details: error.message }, { status: 500 });
    }
}