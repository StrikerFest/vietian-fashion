// app/api/reviews/[reviewId]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// PUT (Approve/Update)
export async function PUT(request, context) {
    const params = await context.params;
    const { reviewId } = params;
    const { is_approved } = await request.json();

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // ----------------------------

    if (!reviewId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const { data, error } = await supabase
            .from('reviews')
            .update({ is_approved: is_approved })
            .eq('id', parseInt(reviewId))
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ message: 'Đã cập nhật đánh giá.', review: data });

    } catch (error) {
        return NextResponse.json({ error: 'Cập nhật đánh giá thất bại.', details: error.message }, { status: 500 });
    }
}

// DELETE (Archive)
export async function DELETE(request, context) {
    const params = await context.params;
    const { reviewId } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // ----------------------------

    if (!reviewId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const { error } = await supabase
            .from('reviews')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', parseInt(reviewId));

        if (error) throw error;

        return NextResponse.json({ message: 'Lưu trữ đánh giá thành công.' });

    } catch (error) {
        return NextResponse.json({ error: 'Lưu trữ đánh giá thất bại.', details: error.message }, { status: 500 });
    }
}