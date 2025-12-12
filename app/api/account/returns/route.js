// app/api/account/returns/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
        }

        // Fetch Returns with Dynamic Attributes
        const { data, error } = await supabase
            .from('return_requests')
            .select(`
                id,
                created_at,
                status,
                reason,
                order_id,
                return_items (
                    id,
                    quantity,
                    order_items (
                        product_variants (
                            sku,
                            products ( name, image_url ),
                            variant_attributes (
                                attribute_value:categories (
                                    name, parent:parent_id ( name )
                                )
                            )
                        )
                    )
                )
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten attributes for easier frontend consumption
        const formatted = data.map(req => ({
            ...req,
            return_items: req.return_items.map(ri => {
                const variant = ri.order_items?.product_variants;
                const attributes = {};

                variant?.variant_attributes?.forEach(va => {
                    if (va.attribute_value?.parent?.name) {
                        attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                    }
                });

                return {
                    ...ri,
                    order_items: {
                        ...ri.order_items,
                        product_variants: {
                            ...variant,
                            attributes // Inject mapped attributes
                        }
                    }
                };
            })
        }));

        return NextResponse.json(formatted || []);

    } catch (error) {
        console.error('Error fetching customer returns:', error);
        return NextResponse.json({ error: 'Lỗi khi tải danh sách trả hàng.' }, { status: 500 });
    }
}