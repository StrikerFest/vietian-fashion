// app/api/categories/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all categories
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        // The frontend will be responsible for building the hierarchy from this flat list.
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: 'Failed to fetch categories.', details: error.message }, { status: 500 });
    }
}

// POST a new category
export async function POST(request) {
    const { name, description, parent_id } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create a URL-friendly slug from the name
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name, slug, description, parent_id: parent_id || null }])
            .select()
            .single();

        if (error) {
            // Handle unique constraint violation (e.g., duplicate name or slug)
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A category with this name or slug already exists.' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json({ error: 'Failed to create category.', details: error.message }, { status: 500 });
    }
}