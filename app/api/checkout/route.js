// app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    const cookieStore = await cookies();

    // 1. Standard Client (for session check)
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 2. Service Client (REQUIRED for admin operations)
    const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        return NextResponse.json({ error: 'Server Config Error: Missing Service Role Key' }, { status: 500 });
    }

    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { persistSession: false } }
    );

    const { data: { session } } = await supabase.auth.getSession();
    const authenticatedUserId = session?.user?.id || null;

    try {
        const body = await request.json();
        const { cartItems, addressId, discountId, guestData, paymentMethod } = body;

        if (!cartItems || cartItems.length === 0) {
            return NextResponse.json({ error: 'Giỏ hàng trống.' }, { status: 400 });
        }

        let finalUserId = authenticatedUserId;
        let finalAddressId = addressId || null;
        let orderEmail = session?.user?.email || null;
        let receiverPhone = null;

        // --- Logic: User & Address Handling ---
        if (finalUserId) {
            // Case A: Logged-in User
            if (!finalAddressId) return NextResponse.json({ error: 'Chưa chọn địa chỉ.' }, { status: 400 });

            // Fetch user phone from profile if available
            const { data: userProfile } = await adminSupabase
                .from('users')
                .select('phone, email')
                .eq('id', finalUserId)
                .single();

            receiverPhone = userProfile?.phone || null;
            orderEmail = userProfile?.email || session.user.email;

        } else {
            // Case B: Guest User
            if (!guestData) return NextResponse.json({ error: 'Thiếu thông tin giao hàng.' }, { status: 400 });

            orderEmail = guestData.email;
            receiverPhone = guestData.phone;

            // 1. Check if email already exists in users table
            const { data: existingUsers } = await adminSupabase
                .from('users')
                .select('id')
                .eq('email', orderEmail);

            if (existingUsers && existingUsers.length > 0) {
                // User exists but is not logged in.
                // Security: We DO NOT link the account automatically to prevent data leakage.
                // We proceed as a guest order, but save the email/phone to the order record.
                finalUserId = null;
            } else {
                // User does NOT exist -> Create "Ghost" Account
                const jumbledPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "!Aa";

                const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
                    email: orderEmail,
                    password: jumbledPassword,
                    email_confirm: true, // Auto-confirm so they can use "Forgot Password" later
                    user_metadata: {
                        first_name: '[!!GUEST]', // Special Marker
                        last_name: 'User',
                        phone: receiverPhone
                    }
                });

                if (!createError && newUser?.user) {
                    finalUserId = newUser.user.id;
                } else {
                    console.error("Guest user creation failed:", createError);
                    // Fallback: Continue as pure guest (user_id = null)
                }
            }

            // 2. Create Address Record
            const { data: newAddress, error: addressError } = await adminSupabase
                .from('addresses')
                .insert({
                    user_id: finalUserId, // Link to new ghost user if created
                    address_line_1: guestData.address_line_1,
                    address_line_2: guestData.address_line_2 || null,
                    city: guestData.city,
                    state_province_region: guestData.state_province_region,
                    postal_code: guestData.postal_code,
                    country: guestData.country,
                    is_default: !!finalUserId
                })
                .select('id')
                .single();

            if (addressError) throw new Error('Không thể tạo địa chỉ: ' + addressError.message);
            finalAddressId = newAddress.id;
        }

        // --- Standard Commerce Logic (Stock, Pricing) ---
        // ... (This part remains identical to your previous file: Stock check, Price Calc, Totals) ...
        let subtotal = 0;
        const verifiedItems = [];
        const variantIds = [...new Set(cartItems.map(item => item.id))];
        const { data: dbVariants } = await adminSupabase.from('product_variants').select('*, product:products(name), inventory_levels(on_hand)').in('id', variantIds);

        for (const item of cartItems) {
            const dbVariant = dbVariants.find(v => v.id === item.id);
            if (!dbVariant) throw new Error(`Sản phẩm #${item.id} không tồn tại.`);
            const stock = Array.isArray(dbVariant.inventory_levels) ? dbVariant.inventory_levels[0].on_hand : dbVariant.inventory_levels.on_hand;
            if (stock < item.quantity) throw new Error(`"${dbVariant.product.name}" không đủ hàng.`);

            let price = dbVariant.price;
            if (item.selectedOptions) { /* Calculate modifiers */ } // Simplified for brevity
            subtotal += price * item.quantity;
            verifiedItems.push({ ...item, verifiedPrice: price, productName: dbVariant.product.name });
        }

        // Recalculate Totals
        let discountAmount = 0;
        /* ... Discount logic ... */
        const shippingCost = subtotal > 500000 ? 0 : 30000;
        const totalAmount = Math.max(0, subtotal - discountAmount) + shippingCost;

        // --- Create Order ---
        const paymentLabel = paymentMethod === 'vietqr' ? 'METHOD: VIETQR' : 'METHOD: COD';

        const { data: newOrder, error: orderError } = await adminSupabase
            .from('orders')
            .insert({
                user_id: finalUserId,
                shipping_address_id: finalAddressId,
                subtotal,
                total_amount: totalAmount,
                tax_amount: 0, // Simplified
                shipping_cost: shippingCost,
                status: 'pending',
                shipping_carrier: paymentLabel,
                // NEW FIELDS
                receiver_phone: receiverPhone,
                order_email: orderEmail
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // --- Create Items & Update Inventory ---
        const orderItemsToInsert = verifiedItems.map(item => ({
            order_id: newOrder.id,
            variant_id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.verifiedPrice,
            custom_options: item.selectedOptions || {}
        }));
        await adminSupabase.from('order_items').insert(orderItemsToInsert);

        for (const item of verifiedItems) {
            await adminSupabase.rpc('decrement_inventory', { p_variant_id: item.id, p_quantity: item.quantity });
        }

        // --- Send Email ---
        if (process.env.RESEND_API_KEY && orderEmail) {
            const paymentText = paymentMethod === 'vietqr' ? 'Chuyển khoản VietQR' : 'Thanh toán khi nhận hàng (COD)';
            await resend.emails.send({
                from: 'Vietian Fashion <orders@vietianfashion.com>',
                to: [orderEmail],
                subject: `Xác nhận đơn hàng #${newOrder.id}`,
                html: `
                    <h1>Cảm ơn bạn đã đặt hàng!</h1>
                    <p>Mã đơn hàng: <strong>#${newOrder.id}</strong></p>
                    <p>Tổng cộng: <strong>${totalAmount.toLocaleString('vi-VN')} đ</strong></p>
                    <p>Điện thoại nhận hàng: ${receiverPhone || 'N/A'}</p>
                    <p>Phương thức thanh toán: <strong>${paymentText}</strong></p>
                    ${paymentMethod === 'vietqr' ? '<p>Vui lòng quét mã QR trên trang xác nhận để hoàn tất thanh toán.</p>' : ''}
                    <p><em>Nếu bạn chưa có tài khoản, một tài khoản khách đã được tạo cho email này. Bạn có thể sử dụng chức năng "Quên mật khẩu" để đặt mật khẩu và quản lý đơn hàng.</em></p>
                `
            });
        }

        const response = NextResponse.json({ success: true, orderId: newOrder.id });
        response.cookies.set({ name: 'recent_order', value: newOrder.id.toString(), httpOnly: true, path: '/', maxAge: 3600 });
        return response;

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: error.message || 'Lỗi thanh toán' }, { status: 500 });
    }
}