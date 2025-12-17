// app/api/orders/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request, context) {
    const params = await context.params;
    const { id } = params;
    const orderId =     parseInt(id);

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession();

    // 2. Cookie Check (For Guests)
    const recentOrderCookie = cookieStore.get('recent_order');
    const isGuestAccess = recentOrderCookie && parseInt(recentOrderCookie.value) === orderId;

    let orderData = null;
    let orderError = null;

    if (session) {
        // Authenticated: Standard fetch (RLS handles security)
        const res = await supabase
            .from('orders')
            .select(`
                *,
                tax_amount, shipping_cost, 
                order_discounts ( discounts ( code, type, value ) ),
                addresses ( * ),
                order_items (
                    id, quantity, price_at_purchase, custom_options,
                    product_variants (
                        id, sku, products ( name, image_url ),
                        variant_attributes ( attribute_value:categories ( name, parent:parent_id ( name ) ) )
                    )
                )
            `)
            .eq('id', orderId)
            .single();
        orderData = res.data;
        orderError = res.error;
    }
    else if (isGuestAccess) {
        // Guest with Cookie: Use Admin Client to bypass RLS
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY, // Must exist!
            { auth: { persistSession: false } }
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
                        id, sku, products ( name, image_url ),
                        variant_attributes ( attribute_value:categories ( name, parent:parent_id ( name ) ) )
                    )
                )
            `)
            .eq('id', orderId)
            .single();

        // Double check: Only show if it's actually a guest order (no user_id)
        if (res.data && res.data.user_id === null) {
            orderData = res.data;
        } else {
            orderError = { message: 'Forbidden' };
        }
    }
    else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (orderError || !orderData) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Transform Data
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
                product_variants: { ...item.product_variants, attributes }
            };
        })
    };

    return NextResponse.json(formattedOrder);
}