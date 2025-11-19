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

// DELETE a tag
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id) return NextResponse.json({ error: 'Tag ID required' }, { status: 400 });
    const tagId = parseInt(id);

    try {
        // 1. Check usage in products
        const { count, error: checkError } = await supabase
            .from('product_tags')
            .select('product_id', { count: 'exact', head: true })
            .eq('tag_id', tagId);

        if (checkError) throw checkError;

        if (count > 0) {
            return NextResponse.json({ error: `Cannot delete tag. It is used by ${count} product(s).` }, { status: 400 });
        }

        // 2. Delete
        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', tagId);

        if (error) throw error;

        return NextResponse.json({ message: 'Tag deleted successfully.' });

    } catch (error) {
        console.error(`Error deleting tag ${tagId}:`, error);
        return NextResponse.json({ error: 'Failed to delete tag.', details: error.message }, { status: 500 });
    }
}