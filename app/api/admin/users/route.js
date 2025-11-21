// app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        let query = supabase
            .from('users')
            .select(`
                *,
                orders ( count )
            `, { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(start, end);

        // Apply Search if present
        if (search) {
            // Search by email, first name, or last name
            query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        // Format data
        const users = data.map(user => ({
            ...user,
            order_count: user.orders?.[0]?.count || 0
        }));

        return NextResponse.json({
            data: users,
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users.', details: error.message }, { status: 500 });
    }
}