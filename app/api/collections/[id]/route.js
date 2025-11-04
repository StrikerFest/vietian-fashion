// app/api/collections/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// PUT (update) a single collection
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

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
     if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Collection ID is required.' }, { status: 400 });
    }
    const numericCollectionId = parseInt(id);


    // @unchanged (Slug generation)
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        // --- Include SEO fields in the update operation ---
        const { data, error } = await supabase
            .from('collections') //
            .update({
                name,
                slug,
                description,
                is_featured: !!is_featured, //
                seo_title: seo_title || null, // Add seo_title
                seo_description: seo_description || null // Add seo_description
            })
            .eq('id', numericCollectionId) //
            .select() // Selects all columns of the updated row
            .single();

        // @unchanged (Error handling for duplicate name/slug and not found)
        if (error) {
             if (error.code === '23505') { // Unique constraint violation
                 return NextResponse.json({ error: 'A collection with this name or slug already exists.' }, { status: 409 });
            }
            if (error.code === 'PGRST116') { // Not found
                 return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
            }
            throw error;
        }
         if (!data) {
             // Fallback check
             return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
        }


        return NextResponse.json(data); // Return the updated collection

    } catch (error) {
        console.error(`Error updating collection ${numericCollectionId}:`, error);
        return NextResponse.json({ error: 'Failed to update collection.', details: error.message }, { status: 500 });
    }
}

// @unchanged (DELETE function remains the same)
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

     if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Collection ID is required.' }, { status: 400 });
    }
    const numericCollectionId = parseInt(id);


    try {
        // Safety Check: Ensure the collection is empty before deleting.
        const { count, error: countError } = await supabase
            .from('product_collections') //
            .select('product_id', { count: 'exact', head: true }) //
            .eq('collection_id', numericCollectionId); //

        if(countError) throw countError;

        if (count > 0) {
            return NextResponse.json({ error: `Cannot delete collection. It still contains ${count} product(s).` }, { status: 400 });
        }

        // If the check passes, proceed with deletion.
        const { error: deleteError } = await supabase.from('collections').delete().eq('id', numericCollectionId); //
        if (deleteError) throw deleteError;

        return NextResponse.json({ message: 'Collection deleted successfully.' });

    } catch (error) {
        console.error(`Error deleting collection ${numericCollectionId}:`, error);
        return NextResponse.json({ error: 'Failed to delete collection.', details: error.message }, { status: 500 });
    }
}