// app/api/admin/purchase-orders/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { updateInventory } from '@/utils/inventory';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request, context) {
    const params = await context.params;
    const { id } = params;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                suppliers (*),
                purchase_order_items (
                    id, quantity, cost_price,
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

        // Transform for easier consumption
        const formatted = {
            ...data,
            purchase_order_items: data.purchase_order_items.map(item => {
                const v = item.product_variants;
                let details = '';
                if (v.variant_attributes && v.variant_attributes.length > 0) {
                    details = v.variant_attributes
                        .map(va => va.attribute_value?.name)
                        .filter(Boolean)
                        .join(' / ');
                }

                return {
                    ...item,
                    product_variants: {
                        ...v,
                        formatted_attributes: details // New field helper
                    }
                };
            })
        };

        return NextResponse.json(formatted);

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch details.' }, { status: 500 });
    }
}

// PUT / DELETE Logic remains mostly the same,
// just ensure any fetches inside them use dynamic logic if they display data.
// But the updateInventory helper uses variant_id, which is safe.
// ... (Include existing PUT and DELETE functions here as per previous file)
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const { status } = await request.json();

    const cookieStore = cookies();
    const authSupabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await authSupabase.auth.getSession();

    try {
        const { data: currentPO, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (currentPO.status === 'received' && status === 'received') {
            return NextResponse.json({ error: 'Already received.' }, { status: 400 });
        }

        if (status === 'received') {
            const { data: items, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('variant_id, quantity')
                .eq('purchase_order_id', id);

            if (itemsError) throw itemsError;

            for (const item of items) {
                await updateInventory(supabase, {
                    variantId: item.variant_id,
                    quantityChange: item.quantity,
                    reason: `Purchase Order #${id} received`,
                    userId: session?.user?.id || null
                });
            }
        }

        const { data: updatedPO, error: updateError } = await supabase
            .from('purchase_orders')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;
        return NextResponse.json(updatedPO);

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    try {
        const { data: po } = await supabase.from('purchase_orders').select('status').eq('id', id).single();
        if (po?.status === 'received') return NextResponse.json({ error: 'Cannot delete received order' }, { status: 400 });

        const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ message: 'Deleted' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}