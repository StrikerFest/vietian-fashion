// app/api/discounts/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// PUT (update) a single discount
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    // Extract fields based on the discounts table schema
    const { code, type, value, start_date, end_date, is_active } = await request.json();

    // Basic validation (similar to POST)
    if (!code || !type || value === undefined || value === null) {
        return NextResponse.json({ error: 'Code, Type, and Value are required' }, { status: 400 });
    }
    if (!['percentage', 'fixed'].includes(type)) {
        return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 });
    }
    if (type === 'percentage' && (value < 0 || value > 100)) {
        return NextResponse.json({ error: 'Percentage value must be between 0 and 100.' }, { status: 400 });
    }
    if (type === 'fixed' && value < 0) {
        return NextResponse.json({ error: 'Fixed value cannot be negative.' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('discounts') //
            .update({
                code: code.toUpperCase(),
                type,
                value,
                start_date: start_date || null,
                end_date: end_date || null,
                is_active,
            })
            .eq('id', id)
            .select()
            .single(); // Use single() if you expect only one record to be updated and returned

        if (error) {
            // Handle unique constraint violation for the 'code'
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A discount with this code already exists.' }, { status: 409 });
            }
            // Handle case where the ID doesn't exist
            if (error.code === 'PGRST116') { // PostgREST error for zero rows returned
                return NextResponse.json({ error: 'Discount not found.' }, { status: 404 });
            }
            throw error; // Rethrow other errors
        }

        if (!data) {
            // Should ideally be caught by error.code PGRST116, but added as a fallback
            return NextResponse.json({ error: 'Discount not found.' }, { status: 404 });
        }


        return NextResponse.json(data); // Return the updated discount

    } catch (error) {
        console.error('Error updating discount:', error);
        return NextResponse.json({ error: 'Failed to update discount.', details: error.message }, { status: 500 });
    }
}

// DELETE a single discount
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    try {
        // Optional: Check if the discount is associated with any orders before deleting
        // const { count } = await supabase
        //     .from('order_discounts') //
        //     .select('order_id', { count: 'exact', head: true })
        //     .eq('discount_id', id);
        //
        // if (count > 0) {
        //     return NextResponse.json({ error: `Cannot delete discount. It is associated with ${count} order(s). Consider deactivating it instead.` }, { status: 400 });
        // }

        // Proceed with deletion
        const { error } = await supabase
            .from('discounts') //
            .delete()
            .eq('id', id);

        // Check specifically for errors like row not found, though Supabase might not error if 0 rows deleted
        if (error) throw error;


        // supabase delete doesn't typically error if the row doesn't exist,
        // it just deletes 0 rows. Check affected rows if necessary, or assume success.
        return NextResponse.json({ message: 'Discount deleted successfully.' });

    } catch (error) {
        console.error('Error deleting discount:', error);
        return NextResponse.json({ error: 'Failed to delete discount.', details: error.message }, { status: 500 });
    }
}