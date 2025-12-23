// app/api/orders/export/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Papa from 'papaparse';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Admin Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Build Query (Same logic as Order List)
    const status = searchParams.get('status');
    const fromDate = searchParams.get('start'); // ISO String
    const toDate = searchParams.get('end');     // ISO String

    try {
        let query = supabase
            .from('orders')
            .select(`
                *,
                user:users(email, full_name),
                address:addresses(*)
            `)
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);
        if (fromDate) query = query.gte('created_at', fromDate);
        if (toDate) query = query.lte('created_at', toDate);

        const { data: orders, error } = await query;
        if (error) throw error;

        // 3. Flatten Data for CSV
        // We prioritize order_email/receiver_phone (from new guest flow), fallback to user profile
        const csvData = orders.map(order => ({
            'Order ID': order.id,
            'Date': new Date(order.created_at).toLocaleString('vi-VN'),
            'Status': order.status,
            'Customer Name': order.user?.full_name || order.address?.full_name || 'Guest',
            'Customer Email': order.order_email || order.user?.email || '', // Priority: Order Record -> User Record
            'Phone Number': order.receiver_phone || order.user?.phone || '', // Priority: Order Record -> User Record
            'Address': order.address ? `${order.address.address_line_1}, ${order.address.city}` : '',
            'Total Amount': order.total_amount,
            'Payment Method': order.shipping_carrier || 'COD'
        }));

        // 4. Generate CSV
        const csv = Papa.unparse(csvData);

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`
            }
        });

    } catch (error) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}