// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('payment_status');
    const search = searchParams.get('search');

    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    try {
        let query = supabase
            .from('orders')
            .select(`
                *,
                user:users(email, full_name),
                address:addresses(*)
            `, { count: 'exact' });

        if (status) query = query.eq('status', status);

        // --- Date Logic (Unchanged) ---
        if (fromDate) {
            const startObj = new Date(fromDate + 'T00:00:00Z');
            startObj.setHours(startObj.getHours() - 7);
            query = query.gte('created_at', startObj.toISOString());
        }
        if (toDate) {
            const endObj = new Date(toDate + 'T23:59:59Z');
            endObj.setHours(endObj.getHours() - 7);
            query = query.lte('created_at', endObj.toISOString());
        }

        // --- UPDATED SEARCH LOGIC ---
        if (search) {
            // If numeric, check ID or Phone
            if (!isNaN(search)) {
                // Note: syntax is "column.operator.value"
                // checking id (exact) OR receiver_phone (contains)
                query = query.or(`id.eq.${search},receiver_phone.ilike.%${search}%`);
            } else {
                // If text, check Email (order_email or user email)
                // Note: Searching across joined tables (user.email) is complex in one OR statement.
                // We focus on the Order table fields first for performance and guest support.
                query = query.or(`order_email.ilike.%${search}%`);
            }
        }

        query = query.order('created_at', { ascending: false });

        const start = (page - 1) * limit;
        query = query.range(start, start + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        return NextResponse.json({
            data,
            meta: { page, limit, total: count }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}