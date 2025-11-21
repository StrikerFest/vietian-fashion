// app/api/account/returns/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        // 1. Auth Check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch User's Returns
        const { data, error } = await supabase
            .from('return_requests')
            .select(`
                id,
                created_at,
                status,
                reason,
                order_id,
                return_items (
                    id,
                    quantity,
                    order_items (
                        product_variants (
                            size,
                            color,
                            products ( name, image_url )
                        )
                    )
                )
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data || []);

    } catch (error) {
        console.error('Error fetching customer returns:', error);
        return NextResponse.json({ error: 'Failed to fetch returns.' }, { status: 500 });
    }
}