// app/api/categories/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// GET all categories
export async function GET() {
    try {
        // Fetch should include the new SEO fields as well
        const { data, error } = await supabase
            .from('categories') //
            .select('*') // Select all columns, including seo_title, seo_description
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
    // --- Extract SEO fields from the request body ---
    const {
        name,
        description,
        parent_id,
        seo_title, // New field
        seo_description // New field
     } = await request.json();

    // @unchanged (Validation for name)
    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // @unchanged (Slug generation)
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        // --- Include SEO fields in the insert operation ---
        const { data, error } = await supabase
            .from('categories') //
            .insert([{
                name,
                slug,
                description,
                parent_id: parent_id || null, //
                seo_title: seo_title || null, // Add seo_title
                seo_description: seo_description || null // Add seo_description
             }])
            .select() // Selects all columns of the inserted row, including SEO fields
            .single();

        // @unchanged (Error handling for duplicate name/slug)
        if (error) {
            if (error.code === '23505') { // Unique constraint violation
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