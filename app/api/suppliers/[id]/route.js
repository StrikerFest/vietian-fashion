// app/api/suppliers/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// PUT (update) a single supplier
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const { name, contact_person, email, phone } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Supplier Name is required' }, { status: 400 });
    }
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Supplier ID is required.' }, { status: 400 });
    }
    const numericSupplierId = parseInt(id);

    try {
        const { data, error } = await supabase
            .from('suppliers')
            .update({
                name,
                contact_person: contact_person || null,
                email: email || null,
                phone: phone || null,
            })
            .eq('id', numericSupplierId)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A supplier with this name already exists.' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error(`Error updating supplier ${numericSupplierId}:`, error);
        return NextResponse.json({ error: 'Failed to update supplier.', details: error.message }, { status: 500 });
    }
}

// DELETE (Archive) a single supplier
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Supplier ID is required.' }, { status: 400 });
    }
    const numericSupplierId = parseInt(id);

    try {
        // --- NEW: Soft Delete (Archive) ---
        const { error } = await supabase
            .from('suppliers')
            .update({ deleted_at: new Date().toISOString() }) // Set deleted_at timestamp
            .eq('id', numericSupplierId);

        if (error) throw error;

        return NextResponse.json({ message: 'Supplier archived successfully.' });

    } catch (error) {
        console.error(`Error archiving supplier ${numericSupplierId}:`, error);
        return NextResponse.json({ error: 'Failed to archive supplier.', details: error.message }, { status: 500 });
    }
}