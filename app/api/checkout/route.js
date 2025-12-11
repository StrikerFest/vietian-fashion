// app/api/checkout/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs'; // Switch to dynamic client
import {cookies} from 'next/headers';
import {updateInventory} from '@/utils/inventory';
import {calculateItemPrice} from '@/utils/server-pricing';
import {Resend} from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] TRUST SESSION, NOT CLIENT
    // We get the User ID from the secure HttpOnly cookie, not the JSON body
    const {data: {session}} = await supabase.auth.getSession();
    const authenticatedUserId = session?.user?.id || null;
    // ------------------------------------------

    const {cartItems, addressId, discountId, guestAddressData} = await request.json();

    // Validate Input
    if (!cartItems || cartItems.length === 0) {
        return NextResponse.json({error: 'Cart is empty.'}, {status: 400});
    }

    const finalUserId = authenticatedUserId;
    let finalAddressId = addressId || null;

    try {
        // --- Step 0: Handle Address Logic & Ownership Check ---
        if (!finalUserId) {
            // --- GUEST CHECKOUT ---
            if (!guestAddressData) {
                return NextResponse.json({error: 'Guest checkout requires address data.'}, {status: 400});
            }

            // Create new address record for this guest order
            const {data: newAddress, error: addressError} = await supabase
                .from('addresses')
                .insert({
                    user_id: null, // Explicitly null for guests
                    address_line_1: guestAddressData.address_line_1,
                    address_line_2: guestAddressData.address_line_2 || null,
                    city: guestAddressData.city,
                    state_province_region: guestAddressData.state_province_region,
                    postal_code: guestAddressData.postal_code,
                    country: guestAddressData.country,
                    is_default: false
                })
                .select('id')
                .single();

            if (addressError) throw new Error(`Failed to create guest address: ${addressError.message}`);
            finalAddressId = newAddress.id;

        } else {
            // --- AUTHENTICATED CHECKOUT ---
            if (!finalAddressId) {
                return NextResponse.json({error: 'User must select an address.'}, {status: 400});
            }

            // [SECURITY PATCH] Verify Address Ownership
            // Ensure User A isn't using User B's address ID
            const {data: addressCheck} = await supabase
                .from('addresses')
                .select('user_id')
                .eq('id', finalAddressId)
                .single();

            if (!addressCheck || addressCheck.user_id !== finalUserId) {
                return NextResponse.json({error: 'Invalid or unauthorized shipping address.'}, {status: 403});
            }
        }

        // --- Step 1: Stock Validation ---
        let subtotal = 0;
        const verifiedItems = [];
        const variantIds = [...new Set(cartItems.map(item => item.id))];

        const {data: inventoryLevels, error: inventoryError} = await supabase
            .from('inventory_levels')
            .select('variant_id, on_hand, committed')
            .in('variant_id', variantIds);

        if (inventoryError) throw new Error('Could not verify stock levels.');

        const inventoryMap = new Map(inventoryLevels.map(i => [i.variant_id, i]));

        for (const item of cartItems) {
            const inventory = inventoryMap.get(item.id);
            const availableStock = (inventory?.on_hand || 0) - (inventory?.committed || 0);

            if (!inventory || availableStock < item.quantity) {
                return NextResponse.json({error: `Not enough stock for ${item.productName}. Only ${availableStock} available.`}, {status: 400});
            }

            // Recalculate price on server side
            const verifiedUnitPrice = await calculateItemPrice(supabase, item.id, item.selectedOptions);
            subtotal += verifiedUnitPrice * item.quantity;

            verifiedItems.push({
                ...item,
                verifiedPrice: verifiedUnitPrice
            });
        }

        // --- Step 2: Discount Validation ---
        let validatedDiscount = null;
        let discountAmount = 0;
        if (discountId) {
            const now = new Date();
            const {data: discountData} = await supabase
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

        // --- Step 3: Tax & Shipping ---
        let taxAmount = 0;
        let shippingCost = 0;

        const {data: settingsData} = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'tax_config')
            .single();

        const config = settingsData?.value || {taxRate: 0, shippingCost: 0, freeShippingThreshold: 0};
        const taxableAmount = Math.max(0, subtotal - discountAmount);

        // Tax
        if (config.taxRate > 0) {
            taxAmount = (taxableAmount * config.taxRate) / 100;
        }

        // Shipping
        const freeShippingThreshold = parseFloat(config.freeShippingThreshold || 0);
        if (freeShippingThreshold > 0 && taxableAmount >= freeShippingThreshold) {
            shippingCost = 0;
        } else {
            shippingCost = parseFloat(config.shippingCost || 0);
        }

        const totalAmount = taxableAmount + taxAmount + shippingCost;

        // --- Step 4: Create Order ---
        const {data: newOrder, error: orderError} = await supabase
            .from('orders')
            .insert({
                user_id: finalUserId,
                shipping_address_id: finalAddressId,
                subtotal: subtotal,
                total_amount: totalAmount,
                tax_amount: taxAmount,
                shipping_cost: shippingCost,
                status: 'pending'
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // --- Step 5: Order Items ---
        const orderItemsToInsert = verifiedItems.map(item => ({
            order_id: newOrder.id,
            variant_id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.verifiedPrice,
            custom_options: item.selectedOptions || {}
        }));

        const {error: orderItemsError} = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

        if (orderItemsError) throw orderItemsError;

        // --- Step 6: Discount Link ---
        if (validatedDiscount) {
            await supabase.from('order_discounts').insert({
                order_id: newOrder.id,
                discount_id: validatedDiscount.id
            });
        }

        // --- Step 7: Inventory Update ---
        for (const item of cartItems) {
            await updateInventory(supabase, {
                variantId: item.id,
                quantityChange: -item.quantity,
                reason: `Order #${newOrder.id} placed`,
                userId: finalUserId
            });
        }

        // --- Step 8: Email ---
        try {
            let customerEmail = null;
            let customerName = "Valued Customer";

            if (finalUserId) {
                const {data: user} = await supabase.from('users').select('email, first_name').eq('id', finalUserId).single();
                customerEmail = user?.email;
                customerName = user?.first_name || "Customer";
            }

            if (customerEmail) {
                const {data: template} = await supabase
                    .from('email_templates')
                    .select('*')
                    .eq('type', 'order_confirm')
                    .eq('is_active', true)
                    .single();

                const {data: emailSettings} = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'email_config')
                    .single();

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
        }

        return NextResponse.json({success: true, orderId: newOrder.id});

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({error: 'Checkout failed.', details: error.message}, {status: 500});
    }
}