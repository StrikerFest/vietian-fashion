// app/api/collections/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all collections
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('collections')
            .select('*')
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
    const { name, description, is_featured } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        const { data, error } = await supabase
            .from('collections')
            .insert([{ name, slug, description, is_featured: !!is_featured }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A collection with this name or slug already exists.' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json({ error: 'Failed to create collection.', details: error.message }, { status: 500 });
    }
}