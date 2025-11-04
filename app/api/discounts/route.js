// app/api/discounts/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// GET all discounts
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('discounts') //
            .select('*')
            .order('created_at', { ascending: false }); // Show newest first

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching discounts:', error);
        return NextResponse.json({ error: 'Failed to fetch discounts.', details: error.message }, { status: 500 });
    }
}

// POST a new discount
export async function POST(request) {
    // Extract fields based on the discounts table schema
    const { code, type, value, start_date, end_date, is_active } = await request.json();

    // Basic validation
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
            .insert([{
                code: code.toUpperCase(), // Ensure code is uppercase
                type,
                value,
                start_date: start_date || null,
                end_date: end_date || null,
                is_active: is_active !== undefined ? is_active : true // Default to active if not provided
            }])
            .select()
            .single();

        if (error) {
            // Handle unique constraint violation for the 'code'
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A discount with this code already exists.' }, { status: 409 });
            }
            throw error; // Rethrow other errors
        }

        return NextResponse.json(data); // Return the newly created discount

    } catch (error) {
        console.error('Error creating discount:', error);
        return NextResponse.json({ error: 'Failed to create discount.', details: error.message }, { status: 500 });
    }
}