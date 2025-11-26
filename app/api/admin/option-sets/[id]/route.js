import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET Single (for editing)
export async function GET(request, context) {
    const params = await context.params;
    const { id } = params;

    const { data, error } = await supabase
        .from('option_sets')
        .select(`*, product_options(*)`)
        .eq('id', id)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Sort options
    data.product_options.sort((a, b) => a.position - b.position);
    return NextResponse.json(data);
}

// PUT Update
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

        // 2. Sync Options (Delete all and recreate strategy is simplest for complex nested forms)
        // Ideally, you'd diff them, but for MVP this ensures clean state.
        await supabase.from('product_options').delete().eq('option_set_id', id);

        if (options && options.length > 0) {
            const optionsToInsert = options.map((opt, index) => ({
                option_set_id: id,
                type: opt.type,
                label: opt.label,
                is_required: opt.is_required,
                position: opt.position || index,
                values: opt.values || []
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

// DELETE (Soft Delete)
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