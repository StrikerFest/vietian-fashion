// app/api/reviews/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// GET all reviews (for Admin panel)
export async function GET() {
    try {
        // Fetch all reviews, joining with product and user data for context
        const { data, error } = await supabase
            .from('reviews') //
            .select(`
                id,
                created_at,
                rating,
                comment,
                is_approved,
                product_id, //
                products ( name ), // Join product name
                user_id //
                // Optional: Join user details if available
                // users ( id, first_name, last_name, email )
            `)
            .order('created_at', { ascending: false }); // Show newest first

        if (error) throw error;

        return NextResponse.json(data || []);

    } catch (error) {
        console.error('Error fetching all reviews:', error);
        return NextResponse.json({ error: 'Failed to fetch reviews.', details: error.message }, { status: 500 });
    }
}

// POST a new review (for users on product page)
export async function POST(request) {
    // Extract review data from request body
    const { product_id, rating, comment, user_id } = await request.json(); // user_id might be null

    // --- Validation ---
    if (!product_id || !rating) {
        return NextResponse.json({ error: 'Product ID and Rating are required.' }, { status: 400 });
    }
    // Rating validation (e.g., 1-5 stars)
    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return NextResponse.json({ error: 'Rating must be a number between 1 and 5.' }, { status: 400 });
    }
    // Optional: Add comment length validation

    try {
        // --- Optional: Check if product exists ---
        const { data: productExists, error: productCheckError } = await supabase
            .from('products') //
            .select('id')
            .eq('id', product_id) //
            .maybeSingle(); // Use maybeSingle to not error if product doesn't exist

        if (productCheckError) throw productCheckError;
        if (!productExists) {
            return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
        }

        // --- Insert the new review ---
        // is_approved defaults to false in the database schema
        const { data: newReview, error: insertError } = await supabase
            .from('reviews') //
            .insert({
                product_id, //
                rating: numericRating, //
                comment: comment || null, // Allow empty comment
                user_id: user_id || null // Handle anonymous reviews
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Return the newly created review (or just a success message)
        // Note: Returning the full review might not be necessary for the user submitting it.
        return NextResponse.json({ message: 'Review submitted successfully. It will appear after moderation.', review: newReview }, { status: 201 }); // 201 Created status

    } catch (error) {
        console.error('Error submitting review:', error);
        // Handle potential specific errors, e.g., foreign key violations if user_id is invalid
        if (error.code === '23503') { // Foreign key violation
            return NextResponse.json({ error: 'Invalid user or product reference.' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to submit review.', details: error.message }, { status: 500 });
    }
}