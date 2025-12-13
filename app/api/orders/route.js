// app/api/orders/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs'; // Use dynamic client
import {cookies} from 'next/headers';

export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] ADMIN ONLY - PROTECT CUSTOMER DATA
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }
    // ----------------------------------------------------

    const {searchParams} = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const status = searchParams.get('status');

    try {
        let query = supabase
            .from('orders')
            .select(`
                *,
                users ( id, first_name, last_name, email ),
                addresses ( * ),
                order_discounts ( discounts ( code, type, value ) ),
                order_items (
                    id, quantity, price_at_purchase, custom_options,
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
            `, {count: 'exact'})
            .order('created_at', {ascending: false})
            .range(start, end);

        if (status) query = query.eq('status', status);

        const {data, error, count} = await query;
        if (error) throw error;

        const formattedOrders = data.map(order => ({
            ...order,
            order_items: order.order_items.map(item => {
                const attributes = {};
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

        return NextResponse.json({
            data: formattedOrders,
            meta: {page, limit, total: count, totalPages: Math.ceil((count || 0) / limit)}
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({error: 'Tải đơn hàng thất bại.', details: error.message}, {status: 500});
    }
}