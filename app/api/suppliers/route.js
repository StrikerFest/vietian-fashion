// app/api/suppliers/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET all active suppliers
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .is('deleted_at', null) // --- NEW: Only fetch active records ---
            .order('name', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data || []);

    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return NextResponse.json({ error: 'Failed to fetch suppliers.', details: error.message }, { status: 500 });
    }
}

// POST a new supplier (or restore an archived one)
export async function POST(request) {
    const { name, contact_person, email, phone } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Supplier Name is required' }, { status: 400 });
    }

    try {
        // --- NEW: Check if supplier exists (active or archived) ---
        const { data: existing, error: checkError } = await supabase
            .from('suppliers')
            .select('*')
            .eq('name', name)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // Ignore "not found" error
            throw checkError;
        }

        if (existing) {
            if (existing.deleted_at) {
                // --- NEW: Restore archived supplier ---
                const { data: restored, error: restoreError } = await supabase
                    .from('suppliers')
                    .update({
                        deleted_at: null, // Restore
                        contact_person: contact_person || existing.contact_person,
                        email: email || existing.email,
                        phone: phone || existing.phone
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored, { status: 200 });
            } else {
                // Supplier exists and is active
                return NextResponse.json({ error: 'A supplier with this name already exists.' }, { status: 409 });
            }
        }

        // --- Create new supplier ---
        const { data, error } = await supabase
            .from('suppliers')
            .insert([{
                name,
                contact_person: contact_person || null,
                email: email || null,
                phone: phone || null,
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data, { status: 201 });

    } catch (error) {
        console.error('Error creating supplier:', error);
        return NextResponse.json({ error: 'Failed to create supplier.', details: error.message }, { status: 500 });
    }
}