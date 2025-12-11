// app/api/returns/[id]/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs'; // Dynamic client
import {cookies} from 'next/headers';

export async function PUT(request, context) {
    const params = await context.params;
    const {id} = params;

    // [SECURITY PATCH] AUTH CHECK
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});
    const {data: {session}} = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }
    // ---------------------------

    const {status, admin_notes} = await request.json();

    if (!id || isNaN(parseInt(id))) return NextResponse.json({error: 'Valid ID required.'}, {status: 400});
    const numericRequestId = parseInt(id);

    if (!status || !['approved', 'rejected'].includes(status)) {
        return NextResponse.json({error: 'Invalid status.'}, {status: 400});
    }

    try {
        let responseData;

        if (status === 'rejected') {
            const {data, error} = await supabase
                .from('return_requests')
                .update({status: 'rejected', admin_notes: admin_notes || null})
                .eq('id', numericRequestId)
                .select()
                .single();

            if (error) throw error;
            responseData = data;

        } else if (status === 'approved') {
            const {data, error} = await supabase.rpc('approve_return_request', {
                request_id: numericRequestId,
                notes: admin_notes || null
            });
            if (error) throw new Error(error.message);

            const {data: approvedData} = await supabase
                .from('return_requests')
                .select('*, orders(*)')
                .eq('id', numericRequestId)
                .single();
            responseData = approvedData;
        }

        return NextResponse.json({message: `Return ${status} successfully.`, data: responseData});

    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }
}