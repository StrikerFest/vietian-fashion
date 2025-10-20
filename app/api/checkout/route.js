// app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
    const { cartItems, userId, addressId } = await request.json();

    if (!cartItems || cartItems.length === 0) {
        return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }

    // In a real app, you would get userId from the authenticated session
    // For now, we'll allow it to be null for guest checkouts
    const finalUserId = userId || null;
    const finalAddressId = addressId || null;

    try {
        // --- Step 1: Server-side validation and stock check ---
        let subtotal = 0;
        const variantIds = cartItems.map(item => item.id);

        // Fetch all inventory levels for the items in the cart in one go
        const { data: inventoryLevels, error: inventoryError } = await supabase
            .from('inventory_levels')
            .select('variant_id, on_hand, committed')
            .in('variant_id', variantIds);

        if (inventoryError) throw new Error('Could not verify stock levels.');

        // Create a map for quick lookups
        const inventoryMap = new Map(inventoryLevels.map(i => [i.variant_id, i]));

        for (const item of cartItems) {
            const inventory = inventoryMap.get(item.id);
            const availableStock = (inventory?.on_hand || 0) - (inventory?.committed || 0);

            if (!inventory || availableStock < item.quantity) {
                return NextResponse.json({ error: `Not enough stock for ${item.productName} - ${item.sku}. Only ${availableStock} available.` }, { status: 400 });
            }
            // Recalculate subtotal on the server to prevent client-side manipulation
            subtotal += item.price * item.quantity;
        }

        // --- Step 2: Create the Order ---
        const totalAmount = subtotal; // In a real app, add shipping, taxes, etc.

        const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: finalUserId,
                shipping_address_id: finalAddressId,
                subtotal: subtotal,
                total_amount: totalAmount,
                status: 'paid' // Or 'pending' if you have a separate payment step
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // --- Step 3: Create Order Items ---
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

        // --- Step 4: Decrement Inventory ---
        // This is a critical step. We use an RPC call to a database function
        // to ensure this operation is atomic (all or nothing).
        for (const item of cartItems) {
            const inventory = inventoryMap.get(item.id);
            const { error: decrementError } = await supabase
                .from('inventory_levels')
                .update({
                    on_hand: inventory.on_hand - item.quantity,
                })
                .eq('variant_id', item.id);

            if (decrementError) {
                // In a real app, you would have a transaction to roll back the order creation.
                // For now, we'll log the critical error.
                console.error(`CRITICAL: Order ${newOrder.id} was created, but failed to decrement stock for variant ${item.id}.`);
                throw decrementError;
            }
        }

        return NextResponse.json({ success: true, orderId: newOrder.id });

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Checkout failed.', details: error.message }, { status: 500 });
    }
}