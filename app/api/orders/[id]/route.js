// app/api/orders/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { updateInventory } from '@/utils/inventory';

export async function GET(request, context) {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                tax_amount,    
                shipping_cost, 
                order_discounts ( discounts ( code, type, value ) ),
                addresses ( * ),
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
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Transform (Consistent with List View)
        const formattedOrder = {
            ...order,
            tax_amount: order.tax_amount || 0,
            shipping_cost: order.shipping_cost || 0,
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
        };

        return NextResponse.json(formattedOrder);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { shipping_carrier, tracking_number, status } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        // 1. Handle Cancellation (Requires Inventory Restock)
        if (status === 'cancelled') {
            const { data: order, error: fetchError } = await supabase
                .from('orders')
                .select(`status, user_id, order_items ( variant_id, quantity )`)
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;
            if (['cancelled', 'delivered'].includes(order.status)) {
                return NextResponse.json({ error: 'Cannot cancel.' }, { status: 400 });
            }

            for (const item of order.order_items) {
                await updateInventory(supabase, {
                    variantId: item.variant_id,
                    quantityChange: item.quantity,
                    reason: `Order #${id} cancelled`,
                    userId: order.user_id
                });
            }

            const { data: updated } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id).select().single();
            return NextResponse.json({ message: 'Order cancelled', order: updated });
        }

        // 2. Handle General Updates (Status: Pending -> Paid, or Tracking Info)
        else {
            const updates = {};
            if (shipping_carrier !== undefined) updates.shipping_carrier = shipping_carrier;
            if (tracking_number !== undefined) updates.tracking_number = tracking_number;
            if (status) updates.status = status; // Allow updating status to 'paid', 'shipped', etc.

            const { data: updated, error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ message: 'Order updated', order: updated });
        }
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}