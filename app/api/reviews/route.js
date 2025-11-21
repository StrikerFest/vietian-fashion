// app/api/reviews/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all active reviews (Admin)
export async function GET(request) {
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
            .is('deleted_at', null) // Only active
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
        return NextResponse.json({ error: 'Failed to fetch reviews.', details: error.message }, { status: 500 });
    }
}

// POST (Create Review) - @unchanged
export async function POST(request) {
    const { product_id, rating, comment, user_id } = await request.json();

    if (!product_id || !rating) {
        return NextResponse.json({ error: 'Product ID and Rating are required.' }, { status: 400 });
    }
    const numericRating = Number(rating);

    try {
        const { data: newReview, error: insertError } = await supabase
            .from('reviews')
            .insert({
                product_id,
                rating: numericRating,
                comment: comment || null,
                user_id: user_id || null
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ message: 'Review submitted successfully.', review: newReview }, { status: 201 });

    } catch (error) {
        console.error('Error submitting review:', error);
        return NextResponse.json({ error: 'Failed to submit review.', details: error.message }, { status: 500 });
    }
}