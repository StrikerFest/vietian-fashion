// app/api/admin/inventory/logs/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const { data, error } = await supabase
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
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching inventory logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs.' }, { status: 500 });
    }
}