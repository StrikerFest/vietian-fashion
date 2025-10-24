// app/api/categories/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// PUT (update) a single category
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

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
     if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Category ID is required.' }, { status: 400 });
    }
    const numericCategoryId = parseInt(id);


    // @unchanged (Slug generation)
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        // --- Include SEO fields in the update operation ---
        const { data, error } = await supabase
            .from('categories') //
            .update({
                name,
                slug,
                description,
                parent_id: parent_id || null, //
                seo_title: seo_title || null, // Add seo_title
                seo_description: seo_description || null // Add seo_description
            })
            .eq('id', numericCategoryId) //
            .select() // Selects all columns of the updated row
            .single();

        // @unchanged (Error handling for duplicate name/slug and not found)
        if (error) {
             if (error.code === '23505') { // Unique constraint violation
                 return NextResponse.json({ error: 'A category with this name or slug already exists.' }, { status: 409 });
            }
            if (error.code === 'PGRST116') { // Not found
                 return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
            }
            throw error;
        }
         if (!data) {
             // Fallback check
             return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
        }


        return NextResponse.json(data); // Return the updated category

    } catch (error) {
        console.error(`Error updating category ${numericCategoryId}:`, error);
        return NextResponse.json({ error: 'Failed to update category.', details: error.message }, { status: 500 });
    }
}

// @unchanged (DELETE function remains the same)
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

     if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Category ID is required.' }, { status: 400 });
    }
    const numericCategoryId = parseInt(id);


    try {
        // --- Safety Check 1: Check for child categories ---
        const { data: children, error: childrenError } = await supabase
            .from('categories').select('id').eq('parent_id', numericCategoryId); //
        if(childrenError) throw childrenError;
        if (children && children.length > 0) {
            return NextResponse.json({ error: `Cannot delete category. It has ${children.length} child category/ies. Please reassign or delete them first.` }, { status: 400 });
        }

        // --- Safety Check 2: Check for associated products ---
        const { count: productCount, error: productCountError } = await supabase
            .from('product_categories') //
            .select('product_id', { count: 'exact', head: true }) // More efficient count
            .eq('category_id', numericCategoryId); //
         if(productCountError) throw productCountError;
        if (productCount > 0) {
            return NextResponse.json({ error: `Cannot delete category. It has ${productCount} associated product(s). Please reassign them first.` }, { status: 400 });
        }

        // If checks pass, proceed with deletion
        const { error: deleteError } = await supabase.from('categories').delete().eq('id', numericCategoryId); //
        if (deleteError) throw deleteError;

        return NextResponse.json({ message: 'Category deleted successfully.' });

    } catch (error) {
        console.error(`Error deleting category ${numericCategoryId}:`, error);
        return NextResponse.json({ error: 'Failed to delete category.', details: error.message }, { status: 500 });
    }
}