// app/api/discounts/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all active discounts
export async function GET(request) {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        const { data, error, count } = await supabase
            .from('discounts')
            .select('*', { count: 'exact' })
            .is('deleted_at', null)
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
        console.error('Error fetching discounts:', error);
        return NextResponse.json({ error: 'Failed to fetch discounts.', details: error.message }, { status: 500 });
    }
}

// POST - @unchanged
export async function POST(request) {
    const { code, type, value, start_date, end_date, is_active } = await request.json();

    if (!code || !type || value === undefined || value === null) {
        return NextResponse.json({ error: 'Code, Type, and Value are required' }, { status: 400 });
    }

    const upperCode = code.toUpperCase();

    try {
        // Check existing
        const { data: existing, error: checkError } = await supabase
            .from('discounts')
            .select('id, deleted_at')
            .eq('code', upperCode)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
            if (existing.deleted_at) {
                // Restore
                const { data: restored, error: restoreError } = await supabase
                    .from('discounts')
                    .update({
                        deleted_at: null,
                        type,
                        value,
                        start_date: start_date || null,
                        end_date: end_date || null,
                        is_active: is_active !== undefined ? is_active : true
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                return NextResponse.json({ error: 'A discount with this code already exists.' }, { status: 409 });
            }
        }

        // Create new
        const { data, error } = await supabase
            .from('discounts')
            .insert([{
                code: upperCode,
                type,
                value,
                start_date: start_date || null,
                end_date: end_date || null,
                is_active: is_active !== undefined ? is_active : true
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating discount:', error);
        return NextResponse.json({ error: 'Failed to create discount.', details: error.message }, { status: 500 });
    }
}