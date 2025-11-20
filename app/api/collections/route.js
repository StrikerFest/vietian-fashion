// app/api/collections/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all active collections
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('collections')
            .select('*')
            .is('deleted_at', null) // --- NEW: Only active collections ---
            .order('name', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json({ error: 'Failed to fetch collections.', details: error.message }, { status: 500 });
    }
}

// POST a new collection (or restore)
export async function POST(request) {
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

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        // --- NEW: Check for existing (active or archived) ---
        const { data: existing, error: checkError } = await supabase
            .from('collections')
            .select('id, deleted_at')
            .or(`name.eq.${name},slug.eq.${slug}`)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existing) {
            if (existing.deleted_at) {
                // --- NEW: Restore ---
                const { data: restored, error: restoreError } = await supabase
                    .from('collections')
                    .update({
                        deleted_at: null,
                        description: description || null,
                        is_featured: !!is_featured,
                        seo_title: seo_title || null,
                        seo_description: seo_description || null
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                return NextResponse.json({ error: 'A collection with this name or slug already exists.' }, { status: 409 });
            }
        }

        // Create new
        const { data, error } = await supabase
            .from('collections')
            .insert([{
                name,
                slug,
                description,
                is_featured: !!is_featured,
                seo_title: seo_title || null,
                seo_description: seo_description || null
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json({ error: 'Failed to create collection.', details: error.message }, { status: 500 });
    }
}