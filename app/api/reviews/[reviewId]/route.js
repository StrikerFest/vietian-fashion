// app/api/reviews/[reviewId]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// PUT (update - primarily for approving) a single review
export async function PUT(request, context) {
    const params = await context.params;
    const { reviewId } = params;

    // We expect the body to indicate the approval status
    // For simplicity, we'll only handle setting is_approved to true
    // You could expand this to handle un-approving if needed
    const { is_approved } = await request.json();

    if (is_approved !== true) {
        // Currently, we only support approving.
        // You could modify this to accept `false` to un-approve if desired.
        return NextResponse.json({ error: 'Only approving reviews (is_approved: true) is currently supported.' }, { status: 400 });
    }

    if (!reviewId || isNaN(parseInt(reviewId))) {
        return NextResponse.json({ error: 'Valid Review ID is required.' }, { status: 400 });
    }
    const numericReviewId = parseInt(reviewId);

    try {
        const { data, error } = await supabase
            .from('reviews') //
            .update({ is_approved: true }) // Set is_approved to true
            .eq('id', numericReviewId) // Match the review ID
            .select() // Select the updated record to return it
            .single(); // Expect only one record to be updated

        if (error) {
            // Handle case where the ID doesn't exist
            if (error.code === 'PGRST116') { // PostgREST error for zero rows returned
                return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
            }
            throw error; // Rethrow other errors
        }

        if (!data) {
            // Fallback check if error code didn't catch it
            return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Review approved successfully.', review: data });

    } catch (error) {
        console.error(`Error updating review ${numericReviewId}:`, error);
        return NextResponse.json({ error: 'Failed to update review.', details: error.message }, { status: 500 });
    }
}

// DELETE a single review
export async function DELETE(request, context) {
    const params = await context.params;
    const { reviewId } = params;

    if (!reviewId || isNaN(parseInt(reviewId))) {
        return NextResponse.json({ error: 'Valid Review ID is required.' }, { status: 400 });
    }
    const numericReviewId = parseInt(reviewId);


    try {
        const { error } = await supabase
            .from('reviews') //
            .delete()
            .eq('id', numericReviewId); //

        if (error) throw error;

        // As before, Supabase delete doesn't typically error if 0 rows are affected.
        // If you need to confirm deletion, you might fetch before deleting.
        return NextResponse.json({ message: 'Review deleted successfully.' });

    } catch (error) {
        console.error(`Error deleting review ${numericReviewId}:`, error);
        // Handle specific errors if needed (e.g., foreign key constraints if reviews are linked elsewhere)
        return NextResponse.json({ error: 'Failed to delete review.', details: error.message }, { status: 500 });
    }
}