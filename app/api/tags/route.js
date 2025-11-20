// app/api/tags/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all active tags
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .is('deleted_at', null) // --- NEW: Only active tags ---
            .order('name', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching tags:', error);
        return NextResponse.json({ error: 'Failed to fetch tags.', details: error.message }, { status: 500 });
    }
}

// POST a new tag (or restore)
export async function POST(request) {
    const { name } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Tag Name is required' }, { status: 400 });
    }

    const tagName = name.toLowerCase().trim();

    try {
        // --- NEW: Check for existing tag (active or archived) ---
        const { data: existingTag, error: checkError } = await supabase
            .from('tags')
            .select('id, deleted_at')
            .eq('name', tagName)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingTag) {
            if (existingTag.deleted_at) {
                // --- NEW: Restore archived tag ---
                const { data: restored, error: restoreError } = await supabase
                    .from('tags')
                    .update({ deleted_at: null })
                    .eq('id', existingTag.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                // Tag exists and is active
                return NextResponse.json({ error: 'Tag already exists.' }, { status: 409 });
            }
        }

        // Create new tag
        const { data, error } = await supabase
            .from('tags')
            .insert([{ name: tagName }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating tag:', error);
        return NextResponse.json({ error: 'Failed to create tag.', details: error.message }, { status: 500 });
    }
}