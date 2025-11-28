// app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { updateInventory } from '@/utils/inventory';
import { calculateItemPrice } from '@/utils/server-pricing';
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
        const verifiedItems = [];

        // Dedupe variant IDs for query
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

            // B. Price Verification
            const verifiedUnitPrice = await calculateItemPrice(supabase, item.id, item.selectedOptions);

            subtotal += verifiedUnitPrice * item.quantity;

            verifiedItems.push({
                ...item,
                verifiedPrice: verifiedUnitPrice
            });
        }

        // --- Step 2: Validate Discount ---
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

        // --- Step 5: Create Order Items ---
        const orderItemsToInsert = verifiedItems.map(item => ({
            order_id: newOrder.id,
            variant_id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.verifiedPrice,
            custom_options: item.selectedOptions || {}
        }));

        const { error: orderItemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

        if (orderItemsError) throw orderItemsError;

        // --- Step 6: Link Discount ---
        if (validatedDiscount) {
            await supabase.from('order_discounts').insert({
                order_id: newOrder.id,
                discount_id: validatedDiscount.id
            });
        }

        // --- Step 7: Update Inventory ---
        for (const item of cartItems) {
            await updateInventory(supabase, {
                variantId: item.id,
                quantityChange: -item.quantity,
                reason: `Order #${newOrder.id} placed`,
                userId: finalUserId
            });
        }

        // --- Step 8: Send Email (Dynamic) ---
        try {
            let customerEmail = null;
            let customerName = "Valued Customer";

            if (userId) {
                const { data: user } = await supabase.from('users').select('email, first_name').eq('id', userId).single();
                customerEmail = user?.email;
                customerName = user?.first_name || "Customer";
            }

            if (customerEmail) {
                // Fetch Template
                const { data: template } = await supabase
                    .from('email_templates')
                    .select('*')
                    .eq('type', 'order_confirm')
                    .eq('is_active', true)
                    .single();

                // --- NEW: Fetch Sender Config ---
                const { data: emailSettings } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'email_config')
                    .single();

                // Fallback defaults
                const senderName = emailSettings?.value?.senderName || 'AI Fashion';
                const senderEmail = emailSettings?.value?.senderEmail || 'orders@yourdomain.com';
                const fromAddress = `${senderName} <${senderEmail}>`;

                if (template) {
                    const html = template.body_html
                        .replace('{{customer_name}}', customerName)
                        .replace('{{order_id}}', newOrder.id)
                        .replace('{{total_amount}}', totalAmount.toFixed(2));

                    await resend.emails.send({
                        from: fromAddress,
                        to: customerEmail,
                        subject: template.subject.replace('{{order_id}}', newOrder.id),
                        html: html
                    });
                }
            }
        } catch (e) {
            console.error("Email failed:", e);
            // Don't fail the whole checkout if email fails, but log it critical
        }

        return NextResponse.json({ success: true, orderId: newOrder.id });

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Checkout failed.', details: error.message }, { status: 500 });
    }
}