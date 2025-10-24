// app/api/suppliers/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// PUT (update) a single supplier
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    // Extract fields based on the suppliers table schema
    const { name, contact_person, email, phone } = await request.json();

    // Basic validation
    if (!name) {
        return NextResponse.json({ error: 'Supplier Name is required' }, { status: 400 });
    }
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Supplier ID is required.' }, { status: 400 });
    }
    const numericSupplierId = parseInt(id);

    // Optional: Add more specific validation for email/phone formats if needed

    try {
        const { data, error } = await supabase
            .from('suppliers') //
            .update({
                name, //
                contact_person: contact_person || null, //
                email: email || null, //
                phone: phone || null, //
            })
            .eq('id', numericSupplierId) //
            .select() // Select the updated record
            .single(); // Expect one record

        if (error) {
            // Handle unique constraint violation for the 'name'
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A supplier with this name already exists.' }, { status: 409 });
            }
            // Handle case where the ID doesn't exist
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
            }
            throw error; // Rethrow other errors
        }
        if (!data) {
            // Fallback check
            return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
        }


        return NextResponse.json(data); // Return the updated supplier

    } catch (error) {
        console.error(`Error updating supplier ${numericSupplierId}:`, error);
        return NextResponse.json({ error: 'Failed to update supplier.', details: error.message }, { status: 500 });
    }
}

// DELETE a single supplier
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Supplier ID is required.' }, { status: 400 });
    }
    const numericSupplierId = parseInt(id);


    try {
        // --- Optional Safety Check: Prevent deletion if linked to purchase orders ---
        // const { count, error: checkError } = await supabase
        //     .from('purchase_orders') //
        //     .select('id', { count: 'exact', head: true })
        //     .eq('supplier_id', numericSupplierId); //
        //
        // if(checkError) throw checkError;
        //
        // if (count > 0) {
        //     return NextResponse.json({ error: `Cannot delete supplier. It is associated with ${count} purchase order(s).` }, { status: 400 });
        // }

        // --- Proceed with deletion ---
        const { error } = await supabase
            .from('suppliers') //
            .delete()
            .eq('id', numericSupplierId); //

        if (error) throw error;

        // Supabase delete doesn't typically error if the row doesn't exist
        return NextResponse.json({ message: 'Supplier deleted successfully.' });

    } catch (error) {
        console.error(`Error deleting supplier ${numericSupplierId}:`, error);
        // Handle specific errors like foreign key constraints if needed
        return NextResponse.json({ error: 'Failed to delete supplier.', details: error.message }, { status: 500 });
    }
}