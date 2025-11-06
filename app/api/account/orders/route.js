// app/api/account/orders/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const cookieStore = cookies();
    // 1. Create a Supabase client for route handlers
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        // 2. Get the current user's session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        // 3. If no session, return unauthorized
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // 4. Fetch orders belonging *only* to the authenticated user
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                created_at,
                total_amount,
                status,
                order_items (
                    quantity,
                    price_at_purchase,
                    product_variants (
                        id,
                        sku,
                        color,
                        size,
                        products ( name )
                    )
                )
            `)
            .eq('user_id', userId) // The crucial filter
            .order('created_at', { ascending: false }); // Show newest orders first

        if (error) {
            throw error;
        }

        // 5. Return the user's orders
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching user orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders.', details: error.message }, { status: 500 });
    }
}