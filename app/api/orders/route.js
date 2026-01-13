// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('payment_status');
    const search = searchParams.get('search');

    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    try {
        let query = supabase
            .from('orders')
            .select(`
                *,
                addresses:shipping_address_id ( * ),
                order_items (
                    id, quantity, price_at_purchase, returned_quantity, custom_options,
                    product_variants (
                        id, sku, products ( name, image_url ),
                        variant_attributes ( attribute_value:categories ( name, parent:parent_id ( name ) ) )
                    )
                )
            `, { count: 'exact' });

        if (status) query = query.eq('status', status);

        // --- Date Logic ---
        if (fromDate) {
            const startObj = new Date(fromDate + 'T00:00:00Z');
            startObj.setHours(startObj.getHours() - 7);
            query = query.gte('created_at', startObj.toISOString());
        }
        if (toDate) {
            const endObj = new Date(toDate + 'T23:59:59Z');
            endObj.setHours(endObj.getHours() - 7);
            query = query.lte('created_at', endObj.toISOString());
        }

        // --- SEARCH LOGIC ---
        if (search) {
            const cleanSearch = search.trim();
            if (!isNaN(cleanSearch) && cleanSearch !== '') {
                query = query.or(`id.eq.${cleanSearch},receiver_phone.ilike.%${cleanSearch}%`);
            } else {
                query = query.ilike('order_email', `%${cleanSearch}%`);
            }
        }

        query = query.order('created_at', { ascending: false });

        const start = (page - 1) * limit;
        query = query.range(start, start + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        // --- DATA TRANSFORMATION ---
        const formattedData = data.map(order => ({
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
                    product_variants: { ...item.product_variants, attributes }
                };
            })
        }));

        return NextResponse.json({
            data: formattedData,
            meta: { page, limit, total: count }
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}