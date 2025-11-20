// app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { updateInventory } from '@/utils/inventory'; // --- NEW ---

export async function POST(request) {
    const { cartItems, userId, addressId, discountId } = await request.json();

    if (!cartItems || cartItems.length === 0) {
        return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }

    const finalUserId = userId || null;
    const finalAddressId = addressId || null;

    try {
        // --- Step 1: Server-side validation and stock check ---
        let subtotal = 0;
        const variantIds = cartItems.map(item => item.id);

        const { data: inventoryLevels, error: inventoryError } = await supabase
            .from('inventory_levels')
            .select('variant_id, on_hand, committed')
            .in('variant_id', variantIds);

        if (inventoryError) throw new Error('Could not verify stock levels.');

        const inventoryMap = new Map(inventoryLevels.map(i => [i.variant_id, i]));

        for (const item of cartItems) {
            const inventory = inventoryMap.get(item.id);
            const availableStock = (inventory?.on_hand || 0) - (inventory?.committed || 0);

            if (!inventory || availableStock < item.quantity) {
                return NextResponse.json({ error: `Not enough stock for ${item.productName} - ${item.sku}. Only ${availableStock} available.` }, { status: 400 });
            }
            subtotal += item.price * item.quantity;
        }

        // --- Step 2: Validate Discount ---
        let validatedDiscount = null;
        let discountAmount = 0;
        if (discountId) {
            const now = new Date();
            const { data: discountData, error: discountError } = await supabase
                .from('discounts')
                .select('*')
                .eq('id', discountId)
                .single();

            if (discountError || !discountData) {
                return NextResponse.json({ error: 'Invalid discount applied.' }, { status: 400 });
            }

            if (!discountData.is_active ||
                (discountData.start_date && new Date(discountData.start_date) > now) ||
                (discountData.end_date && new Date(discountData.end_date) < now)) {
                return NextResponse.json({ error: 'Applied discount is no longer valid.' }, { status: 400 });
            }

            validatedDiscount = discountData;
            if (validatedDiscount.type === 'percentage') {
                const discountValue = Math.min(Math.max(validatedDiscount.value, 0), 100);
                discountAmount = (subtotal * discountValue) / 100;
            } else if (validatedDiscount.type === 'fixed') {
                discountAmount = Math.min(validatedDiscount.value, subtotal);
            }
            discountAmount = Math.max(0, discountAmount);
        }

        // --- Step 3: Calculate Final Total ---
        const totalAmount = Math.max(0, subtotal - discountAmount);

        // --- Step 4: Create the Order ---
        const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: finalUserId,
                shipping_address_id: finalAddressId,
                subtotal: subtotal,
                total_amount: totalAmount,
                status: 'paid'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // --- Step 5: Create Order Items ---
        const orderItemsToInsert = cartItems.map(item => ({
            order_id: newOrder.id,
            variant_id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.price
        }));

        const { error: orderItemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

        if (orderItemsError) throw orderItemsError;

        // --- Step 6: Link Order and Discount ---
        if (validatedDiscount) {
            const { error: orderDiscountError } = await supabase
                .from('order_discounts')
                .insert({
                    order_id: newOrder.id,
                    discount_id: validatedDiscount.id
                });
            if (orderDiscountError) {
                console.error(`CRITICAL: Failed to link discount ${validatedDiscount.id} to order ${newOrder.id}. Error: ${orderDiscountError.message}`);
            }
        }

        // --- Step 7: Decrement Inventory & Log ---
        // --- MODIFIED: Use updateInventory helper ---
        for (const item of cartItems) {
            try {
                await updateInventory(supabase, {
                    variantId: item.id,
                    quantityChange: -item.quantity, // Negative to reduce stock
                    reason: `Order #${newOrder.id} placed`,
                    userId: finalUserId
                });
            } catch (invError) {
                console.error(`CRITICAL: Failed to update inventory for item ${item.id} in order ${newOrder.id}.`, invError);
                // In a real app, we'd likely want to flag this order for manual review
            }
        }

        return NextResponse.json({ success: true, orderId: newOrder.id });

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Checkout failed.', details: error.message }, { status: 500 });
    }
}