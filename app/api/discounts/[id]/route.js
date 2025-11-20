// app/api/discounts/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// PUT (Update)
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const { code, type, value, start_date, end_date, is_active } = await request.json();

    // (Validation logic same as before)
    if (!code || !type || value === undefined) {
        return NextResponse.json({ error: 'Code, Type, and Value are required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('discounts')
            .update({
                code: code.toUpperCase(),
                type,
                value,
                start_date: start_date || null,
                end_date: end_date || null,
                is_active,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') return NextResponse.json({ error: 'Code exists.' }, { status: 409 });
            throw error;
        }

        if (!data) return NextResponse.json({ error: 'Discount not found.' }, { status: 404 });

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update discount.', details: error.message }, { status: 500 });
    }
}

// DELETE (Archive)
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    try {
        // --- NEW: Soft Delete ---
        const { error } = await supabase
            .from('discounts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Discount archived successfully.' });

    } catch (error) {
        console.error('Error archiving discount:', error);
        return NextResponse.json({ error: 'Failed to archive discount.', details: error.message }, { status: 500 });
    }
}