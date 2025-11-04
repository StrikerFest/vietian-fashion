// app/api/orders/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// PUT (update) a single order - specifically for shipping info
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    // Expecting shipping_carrier and tracking_number in the body
    const { shipping_carrier, tracking_number } = await request.json();

    // Basic validation - ensure at least one field is provided
    if (!shipping_carrier && !tracking_number) {
        return NextResponse.json({ error: 'Shipping carrier or tracking number is required.' }, { status: 400 });
    }

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Order ID is required.' }, { status: 400 });
    }
    const numericOrderId = parseInt(id);

    try {
        const updateData = {};
        if (shipping_carrier !== undefined) {
            updateData.shipping_carrier = shipping_carrier || null; // Allow clearing the field
        }
        if (tracking_number !== undefined) {
            updateData.tracking_number = tracking_number || null; // Allow clearing the field
        }
        // Optionally, update the status to 'shipped' if not already shipped/delivered/cancelled
        // updateData.status = 'shipped'; // Add logic based on current status if needed

        const { data, error } = await supabase
            .from('orders') //
            .update(updateData)
            .eq('id', numericOrderId) //
            .select() // Select the updated record
            .single(); // Expect one record

        if (error) {
            // Handle case where the order ID doesn't exist
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
            }
            throw error; // Rethrow other errors
        }

        if (!data) {
            // Fallback check
            return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
        }


        // Return the updated order details
        return NextResponse.json({ message: 'Order shipping details updated successfully.', order: data });

    } catch (error) {
        console.error(`Error updating shipping details for order ${numericOrderId}:`, error);
        return NextResponse.json({ error: 'Failed to update order shipping details.', details: error.message }, { status: 500 });
    }
}

// NOTE: We don't need GET or DELETE for a specific order ID in this file for now,
// as GET all orders is handled in /api/orders/route.js and deleting orders might be complex.