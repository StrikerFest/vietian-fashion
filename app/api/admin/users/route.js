// app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all active users (customers)
export async function GET() {
    try {
        // Fetch users and include a count of their orders
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                orders ( count )
            `)
            .is('deleted_at', null) // Only active users
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Format the data to make order count easier to access
        const users = data.map(user => ({
            ...user,
            order_count: user.orders?.[0]?.count || 0
        }));

        return NextResponse.json(users);

    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users.', details: error.message }, { status: 500 });
    }
}