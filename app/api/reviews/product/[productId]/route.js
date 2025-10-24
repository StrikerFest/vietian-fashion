// app/api/reviews/product/[productId]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

export async function GET(request, context) {
    const params = await context.params;
    const { productId } = params;

    if (!productId || isNaN(parseInt(productId))) {
        return NextResponse.json({ error: 'Valid Product ID is required.' }, { status: 400 });
    }

    const numericProductId = parseInt(productId);

    try {
        // Fetch only approved reviews for the given product ID
        // Optionally join with users table if you want to display user names (ensure users table has displayable names)
        const { data, error } = await supabase
            .from('reviews') //
            .select(`
                id,
                created_at,
                rating,
                comment
                // Optional: Join user data if needed
                // users ( id, first_name, last_name )
            `)
            .eq('product_id', numericProductId) // Filter by product
            .eq('is_approved', true) // Only fetch approved reviews
            .order('created_at', { ascending: false }); // Show newest reviews first

        if (error) throw error;

        return NextResponse.json(data || []); // Return reviews or an empty array

    } catch (error) {
        console.error(`Error fetching reviews for product ${numericProductId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch reviews.', details: error.message }, { status: 500 });
    }
}