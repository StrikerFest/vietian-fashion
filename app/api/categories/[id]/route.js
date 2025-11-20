// app/api/categories/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// PUT (update) a single category
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

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
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Category ID is required.' }, { status: 400 });
    }
    const numericCategoryId = parseInt(id);

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        const { data, error } = await supabase
            .from('categories')
            .update({
                name,
                slug,
                description,
                parent_id: parent_id || null,
                seo_title: seo_title || null,
                seo_description: seo_description || null
            })
            .eq('id', numericCategoryId)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A category with this name or slug already exists.' }, { status: 409 });
            }
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
            }
            throw error;
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error(`Error updating category ${numericCategoryId}:`, error);
        return NextResponse.json({ error: 'Failed to update category.', details: error.message }, { status: 500 });
    }
}

// DELETE (Archive) a category
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Category ID is required.' }, { status: 400 });
    }
    const numericCategoryId = parseInt(id);

    try {
        // --- NEW: Soft Delete (Archive) ---
        // We removed the safety checks for child categories/products.
        // Archiving allows the data to persist without breaking relationships.
        const { error } = await supabase
            .from('categories')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', numericCategoryId);

        if (error) throw error;

        return NextResponse.json({ message: 'Category archived successfully.' });

    } catch (error) {
        console.error(`Error archiving category ${numericCategoryId}:`, error);
        return NextResponse.json({ error: 'Failed to archive category.', details: error.message }, { status: 500 });
    }
}