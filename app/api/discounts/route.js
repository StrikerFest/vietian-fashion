// app/api/discounts/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all active discounts
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('discounts')
            .select('*')
            .is('deleted_at', null) // --- NEW: Only active ---
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching discounts:', error);
        return NextResponse.json({ error: 'Failed to fetch discounts.', details: error.message }, { status: 500 });
    }
}

// POST a new discount (or restore)
export async function POST(request) {
    const { code, type, value, start_date, end_date, is_active } = await request.json();

    if (!code || !type || value === undefined || value === null) {
        return NextResponse.json({ error: 'Code, Type, and Value are required' }, { status: 400 });
    }

    const upperCode = code.toUpperCase();

    try {
        // --- NEW: Check for existing ---
        const { data: existing, error: checkError } = await supabase
            .from('discounts')
            .select('id, deleted_at')
            .eq('code', upperCode)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
            if (existing.deleted_at) {
                // --- NEW: Restore ---
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