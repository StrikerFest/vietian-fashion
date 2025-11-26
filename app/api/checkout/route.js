// app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { updateInventory } from '@/utils/inventory';
import { calculateItemPrice } from '@/utils/server-pricing'; // --- NEW IMPORT ---
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
        const verifiedItems = []; // Store items with verified prices for step 5

        // Variant IDs might be duplicated in cartItems if options differ, so we dedupe for the query
        const variantIds = [...new Set(cartItems.map(item => item.id))];

        const { data: inventoryLevels, error: inventoryError } = await supabase
            .from('inventory_levels')
            .select('variant_id, on_hand, committed')
            .in('variant_id', variantIds);

        if (inventoryError) throw new Error('Could not verify stock levels.');

        const inventoryMap = new Map(inventoryLevels.map(i => [i.variant_id, i]));

        for (const item of cartItems) {
            // A. Stock Check
            const inventory = inventoryMap.get(item.id);
            const availableStock = (inventory?.on_hand || 0) - (inventory?.committed || 0);

            if (!inventory || availableStock < item.quantity) {
                return NextResponse.json({ error: `Not enough stock for ${item.productName}. Only ${availableStock} available.` }, { status: 400 });
            }

            // B. Price Verification (CRITICAL SECURITY FIX)
            // We ignore item.price from the client and recalculate it.
            const verifiedUnitPrice = await calculateItemPrice(supabase, item.id, item.selectedOptions);

            // Add to subtotal
            subtotal += verifiedUnitPrice * item.quantity;

            // Store for later use (so we don't calculate again)
            verifiedItems.push({
                ...item,
                verifiedPrice: verifiedUnitPrice
            });
        }

        // --- Step 2: Validate Discount (Unchanged) ---
        let validatedDiscount = null;
        let discountAmount = 0;
        if (discountId) {
            const now = new Date();
            const { data: discountData } = await supabase
                .from('discounts')
                .select('*')
                .eq('id', discountId)
                .single();

            if (discountData && discountData.is_active &&
                (!discountData.start_date || new Date(discountData.start_date) <= now) &&
                (!discountData.end_date || new Date(discountData.end_date) >= now)) {

                validatedDiscount = discountData;
                if (validatedDiscount.type === 'percentage') {
                    const val = Math.min(Math.max(validatedDiscount.value, 0), 100);
                    discountAmount = (subtotal * val) / 100;
                } else {
                    discountAmount = Math.min(validatedDiscount.value, subtotal);
                }
                discountAmount = Math.max(0, discountAmount);
            }
        }

        const totalAmount = Math.max(0, subtotal - discountAmount);

        // --- Step 4: Create Order ---
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

        // --- Step 5: Create Order Items (UPDATED) ---
        // We now use the 'verifiedItems' array which contains the server-validated price
        const orderItemsToInsert = verifiedItems.map(item => ({
            order_id: newOrder.id,
            variant_id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.verifiedPrice, // <--- SECURE PRICE
            custom_options: item.selectedOptions || {}
        }));

        const { error: orderItemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

        if (orderItemsError) throw orderItemsError;

        // --- Step 6: Link Discount (Unchanged) ---
        if (validatedDiscount) {
            await supabase.from('order_discounts').insert({
                order_id: newOrder.id,
                discount_id: validatedDiscount.id
            });
        }

        // --- Step 7: Update Inventory (Unchanged) ---
        for (const item of cartItems) {
            await updateInventory(supabase, {
                variantId: item.id,
                quantityChange: -item.quantity,
                reason: `Order #${newOrder.id} placed`,
                userId: finalUserId
            });
        }

        // --- Step 8: Send Email (Unchanged) ---
        try {
            let customerEmail = null;
            let customerName = "Valued Customer";

            if (userId) {
                const { data: user } = await supabase.from('users').select('email, first_name').eq('id', userId).single();
                customerEmail = user?.email;
                customerName = user?.first_name || "Customer";
            }

            if (customerEmail) {
                const { data: template } = await supabase
                    .from('email_templates')
                    .select('*')
                    .eq('type', 'order_confirm')
                    .eq('is_active', true)
                    .single();

                if (template) {
                    const html = template.body_html
                        .replace('{{customer_name}}', customerName)
                        .replace('{{order_id}}', newOrder.id)
                        .replace('{{total_amount}}', totalAmount.toFixed(2));

                    await resend.emails.send({
                        from: 'AI Fashion <orders@yourdomain.com>',
                        to: customerEmail,
                        subject: template.subject.replace('{{order_id}}', newOrder.id),
                        html: html
                    });
                }
            }
        } catch (e) {
            console.error("Email failed:", e);
        }

        return NextResponse.json({ success: true, orderId: newOrder.id });

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Checkout failed.', details: error.message }, { status: 500 });
    }
}