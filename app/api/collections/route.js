// app/api/collections/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// GET all collections
export async function GET() {
    try {
        // Fetch should include the new SEO fields as well
        const { data, error } = await supabase
            .from('collections') //
            .select('*') // Select all columns, including seo_title, seo_description
            .order('name', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json({ error: 'Failed to fetch collections.', details: error.message }, { status: 500 });
    }
}

// POST a new collection
export async function POST(request) {
    // --- Extract SEO fields from the request body ---
    const {
        name,
        description,
        is_featured,
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
            .from('collections') //
            .insert([{
                name,
                slug,
                description,
                is_featured: !!is_featured, //
                seo_title: seo_title || null, // Add seo_title
                seo_description: seo_description || null // Add seo_description
             }])
            .select() // Selects all columns of the inserted row
            .single();

        // @unchanged (Error handling for duplicate name/slug)
        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return NextResponse.json({ error: 'A collection with this name or slug already exists.' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(data); // Return the newly created collection

    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json({ error: 'Failed to create collection.', details: error.message }, { status: 500 });
    }
}