// app/api/tags/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all tags
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching tags:', error);
        return NextResponse.json({ error: 'Failed to fetch tags.', details: error.message }, { status: 500 });
    }
}

// POST a new tag
export async function POST(request) {
    const { name } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Tag Name is required' }, { status: 400 });
    }

    try {
        // Check if tag already exists
        const { data: existingTag, error: checkError } = await supabase
            .from('tags')
            .select('id')
            .eq('name', name.toLowerCase().trim())
            .single();

        if (existingTag) {
            return NextResponse.json({ error: 'Tag already exists.' }, { status: 409 });
        }

        // Create new tag
        const { data, error } = await supabase
            .from('tags')
            .insert([{ name: name.toLowerCase().trim() }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating tag:', error);
        return NextResponse.json({ error: 'Failed to create tag.', details: error.message }, { status: 500 });
    }
}