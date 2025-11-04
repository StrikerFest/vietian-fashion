// app/api/admin/analytics/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

export async function GET() {
    try {
        // --- Fetch Total Orders ---
        const { count: totalOrders, error: ordersError } = await supabase
            .from('orders') //
            .select('id', { count: 'exact', head: true }); // Efficiently count rows

        if (ordersError) throw new Error(`Failed to fetch order count: ${ordersError.message}`);

        // --- Fetch Total Revenue ---
        // Summing 'total_amount' for all orders. Refine with status='paid' if needed.
        const { data: revenueData, error: revenueError } = await supabase
            .from('orders') //
            .select('total_amount'); //

        if (revenueError) throw new Error(`Failed to fetch revenue data: ${revenueError.message}`);

        const totalRevenue = (revenueData || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);

        // --- Fetch Pending Reviews ---
        const { count: pendingReviews, error: reviewsError } = await supabase
            .from('reviews') //
            .select('id', { count: 'exact', head: true })
            .eq('is_approved', false); // Filter for pending reviews

        if (reviewsError) throw new Error(`Failed to fetch pending review count: ${reviewsError.message}`);

        // --- Combine Stats ---
        const analytics = {
            totalOrders: totalOrders ?? 0,
            totalRevenue: totalRevenue ?? 0,
            pendingReviews: pendingReviews ?? 0,
            // Add more stats here later (e.g., total products, new customers today)
        };

        return NextResponse.json(analytics);

    } catch (error) {
        console.error('Error fetching admin analytics:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics data.', details: error.message }, { status: 500 });
    }
}