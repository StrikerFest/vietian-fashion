// app/api/tags/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// PUT (Update) a tag name
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const { name } = await request.json();

    if (!id) return NextResponse.json({ error: 'Tag ID required' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Tag Name required' }, { status: 400 });

    try {
        const { data, error } = await supabase
            .from('tags')
            .update({ name: name.toLowerCase().trim() })
            .eq('id', parseInt(id))
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A tag with this name already exists.' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error(`Error updating tag ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update tag.', details: error.message }, { status: 500 });
    }
}

// DELETE (Archive) a tag
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id) return NextResponse.json({ error: 'Tag ID required' }, { status: 400 });
    const tagId = parseInt(id);

    try {
        // --- NEW: Soft Delete (Archive) ---
        // We removed the "check usage in products" step because archiving allows
        // historical data to persist without breaking foreign keys.
        const { error } = await supabase
            .from('tags')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', tagId);

        if (error) throw error;

        return NextResponse.json({ message: 'Tag archived successfully.' });

    } catch (error) {
        console.error(`Error archiving tag ${tagId}:`, error);
        return NextResponse.json({ error: 'Failed to archive tag.', details: error.message }, { status: 500 });
    }
}