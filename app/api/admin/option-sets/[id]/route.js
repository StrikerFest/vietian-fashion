// app/api/admin/option-sets/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { id } = params;

    const { data, error } = await supabase
        .from('option_sets')
        .select(`*, product_options(*)`)
        .eq('id', id)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    data.product_options.sort((a, b) => a.position - b.position);
    return NextResponse.json(data);
}

export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const { title, priority, is_active, rules, options } = await request.json();

    try {
        // 1. Update Set Header
        const { error: setError } = await supabase
            .from('option_sets')
            .update({ title, priority, is_active, rules })
            .eq('id', id);

        if (setError) throw setError;

        // 2. Sync Options (Delete old, Insert new)
        await supabase.from('product_options').delete().eq('option_set_id', id);

        if (options && options.length > 0) {
            const optionsToInsert = options.map((opt, index) => ({
                option_set_id: id,
                type: opt.type,
                label: opt.label,
                is_required: opt.is_required,
                position: opt.position || index,
                values: opt.values || [],
                // --- NEW: Save the base price modifier ---
                price_modifier: opt.price_modifier || 0
            }));

            const { error: optError } = await supabase
                .from('product_options')
                .insert(optionsToInsert);

            if (optError) throw optError;
        }

        return NextResponse.json({ message: 'Updated successfully' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE remains unchanged (soft delete on parent set cascades or is handled)
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    try {
        const { error } = await supabase
            .from('option_sets')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}