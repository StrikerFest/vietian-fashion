// app/api/categories/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all active categories
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .is('deleted_at', null) // --- NEW: Only fetch active categories ---
            .order('name', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: 'Failed to fetch categories.', details: error.message }, { status: 500 });
    }
}

// POST a new category (or restore an archived one)
export async function POST(request) {
    const {
        name,
        description,
        parent_id,
        seo_title,
        seo_description
    } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        // --- NEW: Check for existing category (active or archived) ---
        const { data: existing, error: checkError } = await supabase
            .from('categories')
            .select('id, deleted_at')
            .or(`name.eq.${name},slug.eq.${slug}`)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existing) {
            if (existing.deleted_at) {
                // --- NEW: Restore archived category ---
                const { data: restored, error: restoreError } = await supabase
                    .from('categories')
                    .update({
                        deleted_at: null, // Restore
                        description: description || null,
                        parent_id: parent_id || null,
                        seo_title: seo_title || null,
                        seo_description: seo_description || null
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                return NextResponse.json({ error: 'A category with this name or slug already exists.' }, { status: 409 });
            }
        }

        // --- Create new category ---
        const { data, error } = await supabase
            .from('categories')
            .insert([{
                name,
                slug,
                description,
                parent_id: parent_id || null,
                seo_title: seo_title || null,
                seo_description: seo_description || null
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json({ error: 'Failed to create category.', details: error.message }, { status: 500 });
    }
}