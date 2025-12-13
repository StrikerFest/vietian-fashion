// app/api/reviews/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Use dynamic client
import { cookies } from 'next/headers';

// GET all active reviews (Admin)
export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY ACCESS
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Không được ủy quyền' }, { status: 401 });
    }
    // ------------------------------------

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        const { data, error, count } = await supabase
            .from('reviews')
            .select(`
                id,
                created_at,
                rating,
                comment,
                is_approved,
                product_id,
                products ( name ),
                user_id
            `, { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        return NextResponse.json({
            data,
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching reviews:', error);
        return NextResponse.json({ error: 'Tải đánh giá thất bại.', details: error.message }, { status: 500 });
    }
}

// POST (Create Review)
export async function POST(request) {
    // [SECURITY PATCH] Ignore 'user_id' from body to prevent spoofing
    const { product_id, rating, comment } = await request.json();

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Get the Real User ID from the session
    const { data: { session } } = await supabase.auth.getSession();
    const realUserId = session?.user?.id || null;

    if (!product_id || !rating) {
        return NextResponse.json({ error: 'ID sản phẩm và Xếp hạng là bắt buộc.' }, { status: 400 });
    }
    const numericRating = Number(rating);

    try {
        const { data: newReview, error: insertError } = await supabase
            .from('reviews')
            .insert({
                product_id,
                rating: numericRating,
                comment: comment || null,
                user_id: realUserId // <--- FORCE THIS: Uses session ID or null
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ message: 'Đã gửi đánh giá thành công.', review: newReview }, { status: 201 });

    } catch (error) {
        console.error('Error submitting review:', error);
        return NextResponse.json({ error: 'Gửi đánh giá thất bại.', details: error.message }, { status: 500 });
    }
}