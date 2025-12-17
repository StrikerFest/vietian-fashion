// app/api/reviews/product/[productId]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request, context) {
    // [FIX] Await params before accessing properties in Next.js 15+
    const params = await context.params;
    const { productId } = params;

    if (!productId || isNaN(parseInt(productId))) {
        return NextResponse.json({ error: 'Valid Product ID is required.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                *,
                user:users (
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq('product_id', parseInt(productId))
            .eq('is_approved', true) // Only fetch approved reviews for public
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch reviews:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}