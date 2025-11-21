// app/api/admin/inventory/logs/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        const { data, error, count } = await supabase
            .from('inventory_adjustments')
            .select(`
                id,
                created_at,
                quantity_change,
                reason,
                user_id,
                users ( email, first_name, last_name ),
                product_variants (
                    sku,
                    size,
                    color,
                    products ( name )
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        return NextResponse.json({
            data,
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching inventory logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs.' }, { status: 500 });
    }
}