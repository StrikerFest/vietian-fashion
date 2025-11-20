// app/api/collections/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// PUT (Update)
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const {
        name,
        description,
        is_featured,
        seo_title,
        seo_description
    } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Collection ID is required.' }, { status: 400 });
    }
    const numericCollectionId = parseInt(id);

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        const { data, error } = await supabase
            .from('collections')
            .update({
                name,
                slug,
                description,
                is_featured: !!is_featured,
                seo_title: seo_title || null,
                seo_description: seo_description || null
            })
            .eq('id', numericCollectionId)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A collection with this name or slug already exists.' }, { status: 409 });
            }
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
            }
            throw error;
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error(`Error updating collection ${numericCollectionId}:`, error);
        return NextResponse.json({ error: 'Failed to update collection.', details: error.message }, { status: 500 });
    }
}

// DELETE (Archive)
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Collection ID is required.' }, { status: 400 });
    }
    const numericCollectionId = parseInt(id);

    try {
        // --- NEW: Soft Delete ---
        const { error: deleteError } = await supabase
            .from('collections')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', numericCollectionId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ message: 'Collection archived successfully.' });

    } catch (error) {
        console.error(`Error archiving collection ${numericCollectionId}:`, error);
        return NextResponse.json({ error: 'Failed to archive collection.', details: error.message }, { status: 500 });
    }
}