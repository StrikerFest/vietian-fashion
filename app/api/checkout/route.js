// app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js'; // Import direct client
import { cookies } from 'next/headers';
import { updateInventory } from '@/utils/inventory';
import { calculateItemPrice } from '@/utils/server-pricing';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    const cookieStore = await cookies();

    // 1. Standard Client (For Auth Users)
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 2. Service Client (For Guest Operations - Bypasses RLS)
    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
    );

    const { data: { session } } = await supabase.auth.getSession();
    const authenticatedUserId = session?.user?.id || null;
    const { cartItems, addressId, discountId, guestAddressData } = await request.json();

    if (!cartItems || cartItems.length === 0) {
        return NextResponse.json({ error: 'Giỏ hàng trống.' }, { status: 400 });
    }

    const finalUserId = authenticatedUserId;
    let finalAddressId = addressId || null;

    try {
        // --- Step 0: Handle Address Logic ---
        if (!finalUserId) {
            // --- GUEST CHECKOUT ---
            if (!guestAddressData) {
                return NextResponse.json({ error: 'Thanh toán khách vãng lai yêu cầu dữ liệu địa chỉ.' }, { status: 400 });
            }

            // [FIX] Use 'adminSupabase' (Service Role) to insert guest address.
            // This prevents "Permission Denied" errors from RLS.
            const { data: newAddress, error: addressError } = await adminSupabase
                .from('addresses')
                .insert({
                    user_id: null,
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

            if (addressError) throw new Error(`Tạo địa chỉ khách vãng lai thất bại: ${addressError.message}`);
            finalAddressId = newAddress.id;

        } else {
            // --- AUTHENTICATED CHECKOUT ---
            // Existing logic is fine here because users own their data
            if (!finalAddressId) return NextResponse.json({ error: 'Người dùng phải chọn một địa chỉ.' }, { status: 400 });

            const { data: addressCheck } = await supabase
                .from('addresses')
                .select('user_id')
                .eq('id', finalAddressId)
                .single();

            if (!addressCheck || addressCheck.user_id !== finalUserId) {
                return NextResponse.json({ error: 'Địa chỉ không hợp lệ.' }, { status: 403 });
            }
        }

        // ... (Stock Validation, Pricing, Discount logic remains the same) ...
        // Note: Make sure to use 'adminSupabase' if you encounter any other RLS issues,
        // but typically reading products/discounts is public and fine.

        // --- Step 1 (re-verified) ---
        // Verify Stock using Admin Client to ensure we see TRUE stock even if some is "hidden" (optional, but safer)
        const variantIds = [...new Set(cartItems.map(item => item.id))];
        const { data: inventoryLevels, error: inventoryError } = await adminSupabase
            .from('inventory_levels')
            .select('variant_id, on_hand, committed')
            .in('variant_id', variantIds);

        // ... (Rest of logic) ...

        // --- Step 4: Create Order ---
        // [FIX] Use adminSupabase for Order Creation to ensure it works for Guests
        const { data: newOrder, error: orderError } = await adminSupabase
            .from('orders')
            .insert({
                user_id: finalUserId,
                shipping_address_id: finalAddressId,
                // ... other fields ...
                subtotal: subtotal, // Make sure these variables are defined from your existing logic
                total_amount: totalAmount, // Make sure these variables are defined from your existing logic
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

        const { error: orderItemsError } = await adminSupabase
            .from('order_items')
            .insert(orderItemsToInsert);

        if (orderItemsError) throw orderItemsError;

        // ... (Discount Link, Inventory Update, Email) ...

        return NextResponse.json({ success: true, orderId: newOrder.id });

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Thanh toán thất bại.', details: error.message }, { status: 500 });
    }
}