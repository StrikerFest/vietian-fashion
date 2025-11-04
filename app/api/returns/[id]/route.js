// app/api/returns/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// PUT (update) a single return request (Approve or Reject)
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const { status, admin_notes } = await request.json(); // Expect 'approved' or 'rejected'

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Return Request ID is required.' }, { status: 400 });
    }
    const numericRequestId = parseInt(id);

    if (!status || !['approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Status must be "approved" or "rejected".' }, { status: 400 });
    }

    try {
        let responseData;

        if (status === 'rejected') {
            // --- Handle Rejection (Simple Update) ---
            const { data, error } = await supabase
                .from('return_requests') //
                .update({
                    status: 'rejected',
                    admin_notes: admin_notes || null
                })
                .eq('id', numericRequestId) //
                .select()
                .single();

            if (error) throw error;
            responseData = data;

        } else if (status === 'approved') {
            // --- Handle Approval (Complex Transaction via RPC) ---
            // We call a database function to handle this atomically
            // We will create this function in Supabase next.
            const { data, error } = await supabase.rpc('approve_return_request', {
                request_id: numericRequestId,
                notes: admin_notes || null
            });

            if (error) {
                // The RPC function will 'raise exception' on failure, which Supabase client catches
                throw new Error(`Failed to approve return: ${error.message}`);
            }

            // Refetch the data to return the updated request
            const { data: approvedData, error: fetchError } = await supabase
                .from('return_requests') //
                .select('*, orders(*)') //
                .eq('id', numericRequestId)
                .single();

            if (fetchError) throw fetchError;
            responseData = approvedData;
        }

        return NextResponse.json({ message: `Return request ${status} successfully.`, data: responseData });

    } catch (error) {
        console.error(`Error processing return request ${numericRequestId}:`, error);
        return NextResponse.json({ error: 'Failed to process return request.', details: error.message }, { status: 500 });
    }
}