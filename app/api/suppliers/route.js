// app/api/suppliers/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // [cite: strikerfest/vietian-fashion/vietian-fashion-sorting-1-merged-order-1-merged-collection-1-merged-categories-1/lib/supabaseClient.js]

// GET all suppliers
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('suppliers') // [cite: Context-sql.sql]
            .select('*') // Select all columns
            .order('name', { ascending: true }); // Order alphabetically by name

        if (error) throw error;
        return NextResponse.json(data || []); // Return data or empty array

    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return NextResponse.json({ error: 'Failed to fetch suppliers.', details: error.message }, { status: 500 });
    }
}

// POST a new supplier
export async function POST(request) {
    // Extract fields based on the suppliers table schema [cite: Context-sql.sql]
    const { name, contact_person, email, phone } = await request.json();

    // Basic validation
    if (!name) {
        return NextResponse.json({ error: 'Supplier Name is required' }, { status: 400 });
    }
    // Optional: Add more specific validation for email/phone formats if needed

    try {
        const { data, error } = await supabase
            .from('suppliers') // [cite: Context-sql.sql]
            .insert([{
                name, // [cite: Context-sql.sql]
                contact_person: contact_person || null, // [cite: Context-sql.sql]
                email: email || null, // [cite: Context-sql.sql]
                phone: phone || null, // [cite: Context-sql.sql]
            }])
            .select() // Select the newly created record
            .single(); // Expect only one record to be created

        if (error) {
            // Handle unique constraint violation for the 'name' [cite: Context-sql.sql]
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A supplier with this name already exists.' }, { status: 409 });
            }
            throw error; // Rethrow other errors
        }

        return NextResponse.json(data, { status: 201 }); // Return the newly created supplier with 201 status

    } catch (error) {
        console.error('Error creating supplier:', error);
        return NextResponse.json({ error: 'Failed to create supplier.', details: error.message }, { status: 500 });
    }
}