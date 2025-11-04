// app/api/returns/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; //

// GET all return requests (for Admin panel)
export async function GET() {
    try {
        // We need to fetch the return request and its related data
        // to make the admin list useful.
        const { data, error } = await supabase
            .from('return_requests') //
            .select(`
                id,
                created_at,
                order_id,
                status,
                reason,
                admin_notes,
                
                orders ( 
                    id, 
                    created_at, 
                    total_amount
                ),
                
                users ( 
                    email, 
                    first_name, 
                    last_name 
                ),
                
                return_items (
                    id,
                    quantity,
                    should_restock,
                    order_items (
                        price_at_purchase,
                        product_variants (
                            sku,
                            size,
                            color,
                            products ( name )
                        )
                    )
                )
            `) //
            .order('created_at', { ascending: false }); // Show newest requests first

        if (error) throw error;

        return NextResponse.json(data || []);

    } catch (error) {
        console.error('Error fetching return requests:', error);
        return NextResponse.json({ error: 'Failed to fetch return requests.', details: error.message }, { status: 500 });
    }
}

// We will add the POST route for customers to create returns later.u