// app/api/orders/[id]/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {createClient} from '@supabase/supabase-js'; // Import direct client for admin bypass
import {cookies} from 'next/headers';
import {updateInventory} from '@/utils/inventory';

export async function GET(request, context) {
    const params = await context.params;
    const {id} = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // 1. Try to get Session
    const {data: {session}} = await supabase.auth.getSession();

    // 2. Fetch Order Logic
    let orderData = null;
    let orderError = null;

    if (session) {
        // AUTHENTICATED: Use standard client (subject to RLS)
        // This naturally allows Users to see their own orders, and Admins to see all (if RLS allows)
        const res = await supabase
            .from('orders')
            .select(`
                *,
                tax_amount, shipping_cost, 
                users ( id, first_name, last_name, email ),
                order_discounts ( discounts ( code, type, value ) ),
                addresses ( * ),
                order_items (
                    id, quantity, price_at_purchase, custom_options,
                    product_variants (
                        id, sku, products ( name ),
                        variant_attributes ( attribute_value:categories ( name, parent:parent_id ( name ) ) )
                    )
                )
            `)
            .eq('id', id)
            .single();

        orderData = res.data;
        orderError = res.error;
    } else {
        // GUEST: Use Service Role to bypass RLS (since guests are 'anon' and usually blocked)
        // [SECURITY] We use a fresh client with the Service Key
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, // Fallback if service key missing (dev only)
            {auth: {persistSession: false}}
        );

        const res = await adminSupabase
            .from('orders')
            .select(`
                *,
                tax_amount, shipping_cost, 
                addresses ( * ),
                order_items (
                    id, quantity, price_at_purchase, custom_options,
                    product_variants (
                        id, sku, products ( name ),
                        variant_attributes ( attribute_value:categories ( name, parent:parent_id ( name ) ) )
                    )
                )
            `)
            .eq('id', id)
            .single();

        // [CRITICAL SECURITY CHECK]
        // Only return the order to a guest if the order belongs to a guest (user_id is null)
        // This prevents guests from guessing IDs of registered users.
        if (res.data && res.data.user_id === null) {
            orderData = res.data;
        } else {
            // If order exists but belongs to a user, pretend it doesn't exist
            orderError = {message: 'Unauthorized', code: '401'};
        }
    }

    if (orderError || !orderData) {
        return NextResponse.json({error: 'Không tìm thấy đơn hàng hoặc không có quyền truy cập'}, {status: 404});
    }

    // Transform Data (Consistent format)
    const formattedOrder = {
        ...orderData,
        tax_amount: orderData.tax_amount || 0,
        shipping_cost: orderData.shipping_cost || 0,
        order_items: orderData.order_items.map(item => {
            const attributes = {};
            item.product_variants?.variant_attributes?.forEach(va => {
                if (va.attribute_value?.parent?.name) {
                    attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                }
            });
            return {
                ...item,
                product_variants: {...item.product_variants, attributes}
            };
        })
    };

    return NextResponse.json(formattedOrder);
}

// PUT (Admin Updates) - Keep existing security
export async function PUT(request, context) {
    const params = await context.params;
    const {id} = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});
    const {data: {session}} = await supabase.auth.getSession();

    if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

    const body = await request.json();
    const {shipping_carrier, tracking_number, status} = body;

    try {
        if (status === 'cancelled') {
            const {data: order} = await supabase.from('orders').select('status, order_items(variant_id, quantity)').eq('id', id).single();
            if (['cancelled', 'refunded'].includes(order.status)) return NextResponse.json({error: 'Order already cancelled'}, {status: 400});

            for (const item of order.order_items) {
                await updateInventory(supabase, {
                    variantId: item.variant_id,
                    quantityChange: item.quantity,
                    reason: `Order #${id} cancelled`,
                    userId: session.user.id
                });
            }
            const {data: updated} = await supabase.from('orders').update({status: 'cancelled'}).eq('id', id).select().single();
            return NextResponse.json({message: 'Cancelled', order: updated});
        } else {
            const updates = {};
            if (shipping_carrier !== undefined) updates.shipping_carrier = shipping_carrier;
            if (tracking_number !== undefined) updates.tracking_number = tracking_number;
            if (status) updates.status = status;

            const {data: updated, error} = await supabase.from('orders').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return NextResponse.json({message: 'Updated', order: updated});
        }
    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }
}