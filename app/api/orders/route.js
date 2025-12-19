// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Admin Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('payment_status');
    const search = searchParams.get('search');

    const fromDate = searchParams.get('from_date'); // YYYY-MM-DD
    const toDate = searchParams.get('to_date');     // YYYY-MM-DD

    try {
        let query = supabase
            .from('orders')
            .select(`
                *,
                user:users(email, full_name),
                address:addresses(*)
            `, { count: 'exact' });

        if (status) query = query.eq('status', status);
        if (paymentStatus) query = query.eq('payment_status', paymentStatus);

        // --- DATE FILTERING (VIETNAM TIMEZONE FIX) ---
        // Vietnam is UTC+7.
        // 00:00 VN = 17:00 UTC (Previous Day).
        // We shift the input date back by 7 hours to align with DB UTC timestamps.

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
        // ---------------------------------------------

        if (search) {
            if (!isNaN(search)) {
                query = query.eq('id', search);
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