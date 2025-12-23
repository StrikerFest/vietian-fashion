// app/api/returns/route.js
import { NextResponse } from 'next/server';
import { supabase as staticSupabase } from '@/lib/supabaseClient';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET all return requests (Admin Only) - UNCHANGED
export async function GET() {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await staticSupabase
            .from('return_requests')
            .select(`
                id,
                created_at,
                order_id,
                status,
                reason,
                admin_notes,
                orders ( id, created_at, total_amount ),
                users ( email, first_name, last_name ),
                return_items (
                    id,
                    quantity,
                    should_restock,
                    order_items (
                        price_at_purchase,
                        product_variants (
                            sku,
                            products ( name ),
                            variant_attributes (
                                attribute_value:categories (
                                    name, parent:parent_id ( name )
                                )
                            )
                        )
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);

    } catch (error) {
        console.error('Error fetching return requests:', error);
        return NextResponse.json({ error: 'Failed to fetch return requests.', details: error.message }, { status: 500 });
    }
}

// POST - Create Return Request (Modified for Admin Support)
export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { order_id, items, reason } = body;

        if (!order_id || !items || items.length === 0 || !reason) {
            return NextResponse.json({ error: 'Thiếu các trường bắt buộc.' }, { status: 400 });
        }

        // 1. Check if user is Admin
        const { data: adminRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .single();

        const isAdmin = !!adminRole;

        // 2. Fetch Order & Verify Ownership/Permissions
        let query = supabase
            .from('orders')
            .select('id, status, user_id') // Fetch user_id to link request to customer
            .eq('id', order_id);

        // If NOT admin, enforce ownership check
        if (!isAdmin) {
            query = query.eq('user_id', session.user.id);
        }

        const { data: order, error: orderError } = await query.single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Không tìm thấy đơn hàng hoặc quyền truy cập bị từ chối.' }, { status: 404 });
        }

        // 3. Create Request
        // IMPORTANT: Use order.user_id (the customer), not session.user.id (potentially the admin)
        const { data: returnRequest, error: createError } = await supabase
            .from('return_requests')
            .insert({
                order_id: order_id,
                user_id: order.user_id,
                reason: reason,
                status: 'pending',
                admin_notes: isAdmin ? 'Initiated by Admin' : null
            })
            .select()
            .single();

        if (createError) throw createError;

        // 4. Create Items
        const returnItemsData = items.map(item => ({
            return_request_id: returnRequest.id,
            order_item_id: item.order_item_id,
            quantity: item.quantity,
            should_restock: true
        }));

        const { error: itemsError } = await supabase
            .from('return_items')
            .insert(returnItemsData);

        if (itemsError) {
            await supabase.from('return_requests').delete().eq('id', returnRequest.id);
            throw itemsError;
        }

        return NextResponse.json({ success: true, message: 'Yêu cầu trả hàng đã được tạo.' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}