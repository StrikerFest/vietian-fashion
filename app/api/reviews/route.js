// app/api/reviews/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all active reviews (Admin)
export async function GET() {
    try {
        const { data, error } = await supabase
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
            `)
            .is('deleted_at', null) // --- NEW: Filter active ---
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data || []);

    } catch (error) {
        console.error('Error fetching reviews:', error);
        return NextResponse.json({ error: 'Failed to fetch reviews.', details: error.message }, { status: 500 });
    }
}

// POST (Create Review) - No changes needed, creation is always "new"
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