// app/api/account/orders/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data, error } = await supabase
            .from('orders')
            .select(`
                id, created_at, total_amount, status,
                order_items (
                    quantity, price_at_purchase, custom_options,
                    product_variants (
                        id, sku,
                        products ( name ),
                        variant_attributes (
                            attribute_value:categories ( 
                                name, parent:parent_id ( name ) 
                            )
                        )
                    )
                )
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform for Frontend
        const formatted = data.map(order => ({
            ...order,
            order_items: order.order_items.map(item => {
                const attributes = {};

                // Dynamic mapping
                item.product_variants?.variant_attributes?.forEach(va => {
                    if (va.attribute_value?.parent?.name) {
                        attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                    }
                });

                return {
                    ...item,
                    product_variants: {
                        ...item.product_variants,
                        attributes
                    }
                };
            })
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}