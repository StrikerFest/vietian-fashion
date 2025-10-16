// app/api/categories/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// PUT (update) a single category
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const { name, description, parent_id } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        const { data, error } = await supabase
            .from('categories')
            .update({ name, slug, description, parent_id: parent_id || null })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error updating category:', error);
        return NextResponse.json({ error: 'Failed to update category.', details: error.message }, { status: 500 });
    }
}

// DELETE a single category
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    try {
        // --- Safety Check 1: Check for child categories ---
        const { data: children } = await supabase.from('categories').select('id').eq('parent_id', id);
        if (children && children.length > 0) {
            return NextResponse.json({ error: 'Cannot delete category with children. Please reassign or delete child categories first.' }, { status: 400 });
        }

        // --- Safety Check 2: Check for associated products ---
        const { data: products } = await supabase.from('product_categories').select('product_id', { count: 'exact' }).eq('category_id', id);
        if (products && products.length > 0) {
            return NextResponse.json({ error: `Cannot delete category with ${products.length} associated products. Please reassign them first.` }, { status: 400 });
        }

        // If checks pass, proceed with deletion
        const { error } = await supabase.from('categories').delete().eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Category deleted successfully.' });

    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json({ error: 'Failed to delete category.', details: error.message }, { status: 500 });
    }
}