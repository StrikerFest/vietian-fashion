// app/api/collections/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// PUT (update) a single collection
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const { name, description, is_featured } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        const { data, error } = await supabase
            .from('collections')
            .update({ name, slug, description, is_featured: !!is_featured })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error updating collection:', error);
        return NextResponse.json({ error: 'Failed to update collection.', details: error.message }, { status: 500 });
    }
}

// DELETE a single collection
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    try {
        // Safety Check: Ensure the collection is empty before deleting.
        const { data: products, count } = await supabase
            .from('product_collections')
            .select('product_id', { count: 'exact' })
            .eq('collection_id', id);

        if (count > 0) {
            return NextResponse.json({ error: `Cannot delete collection. It still contains ${count} product(s).` }, { status: 400 });
        }

        // If the check passes, proceed with deletion.
        const { error } = await supabase.from('collections').delete().eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Collection deleted successfully.' });

    } catch (error) {
        console.error('Error deleting collection:', error);
        return NextResponse.json({ error: 'Failed to delete collection.', details: error.message }, { status: 500 });
    }
}