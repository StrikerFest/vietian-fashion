// app/api/admin/option-sets/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('option_sets')
            // Make sure to select price_modifier from product_options
            .select(`
                *,
                product_options (
                    id, type, label, position, values, is_required, price_modifier
                )
            `)
            .is('deleted_at', null)
            .order('priority', { ascending: false });

        if (error) throw error;

        const formatted = data.map(set => ({
            ...set,
            product_options: set.product_options.sort((a, b) => a.position - b.position)
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const { title, priority, is_active, rules, options } = await request.json();

    if (!title) return NextResponse.json({ error: 'Tiêu đề là bắt buộc' }, { status: 400 });

    try {
        // 1. Create Set
        const { data: newSet, error: setError } = await supabase
            .from('option_sets')
            .insert({
                title,
                priority: parseInt(priority) || 0,
                is_active,
                rules: rules || []
            })
            .select()
            .single();

        if (setError) throw setError;

        // 2. Create Options
        if (options && options.length > 0) {
            const optionsToInsert = options.map((opt, index) => ({
                option_set_id: newSet.id,
                type: opt.type,
                label: opt.label,
                is_required: opt.is_required || false,
                position: opt.position || index,
                values: opt.values || [],
                price_modifier: opt.price_modifier || 0
            }));

            const { error: optError } = await supabase
                .from('product_options')
                .insert(optionsToInsert);

            if (optError) throw optError;
        }

        return NextResponse.json(newSet);
    } catch (error) {
        console.error('Error creating option set:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}