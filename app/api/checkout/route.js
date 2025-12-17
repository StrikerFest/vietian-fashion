// app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    const cookieStore = await cookies();

    // 1. Standard Client
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 2. Service Client (CRITICAL: Must use Service Role Key)
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
        const { cartItems, addressId, discountId, guestAddressData } = body;

        if (!cartItems || cartItems.length === 0) {
            return NextResponse.json({ error: 'Giỏ hàng trống.' }, { status: 400 });
        }

        const finalUserId = authenticatedUserId;
        let finalAddressId = addressId || null;

        // --- Step 0: Address Logic ---
        if (!finalUserId) {
            if (!guestAddressData) return NextResponse.json({ error: 'Thiếu địa chỉ.' }, { status: 400 });

            // Create Guest Address
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

            if (addressError) throw new Error('Không thể tạo địa chỉ: ' + addressError.message);
            finalAddressId = newAddress.id;
        } else {
            if (!finalAddressId) return NextResponse.json({ error: 'Chưa chọn địa chỉ.' }, { status: 400 });
        }

        // --- Step 1: Verify Stock ---
        let subtotal = 0;
        const verifiedItems = [];
        const variantIds = [...new Set(cartItems.map(item => item.id))];

        const { data: dbVariants, error: vErr } = await adminSupabase
            .from('product_variants')
            .select(`
                id, price, sku, product_id,
                product:products(name),
                inventory_levels(on_hand)
            `)
            .in('id', variantIds);

        if (vErr) throw new Error('Lỗi kiểm tra kho.');

        for (const item of cartItems) {
            const dbVariant = dbVariants.find(v => v.id === item.id);
            if (!dbVariant) throw new Error(`Sản phẩm #${item.id} không tồn tại.`);

            const stockData = Array.isArray(dbVariant.inventory_levels) ? dbVariant.inventory_levels[0] : dbVariant.inventory_levels;
            const availableStock = stockData?.on_hand || 0;

            if (availableStock < item.quantity) {
                throw new Error(`"${dbVariant.product?.name}" không đủ hàng.`);
            }

            let itemPrice = dbVariant.price;
            if (item.selectedOptions) {
                Object.values(item.selectedOptions).forEach(opt => {
                    if (opt.priceModifier) itemPrice += opt.priceModifier;
                });
            }

            subtotal += itemPrice * item.quantity;
            verifiedItems.push({ ...item, verifiedPrice: itemPrice, productName: dbVariant.product?.name });
        }

        // --- Step 2: Discount ---
        let discountAmount = 0;
        if (discountId) {
            const { data: discount } = await adminSupabase.from('discounts').select('*').eq('id', discountId).single();
            if (discount && discount.is_active) {
                if (discount.type === 'percentage') {
                    discountAmount = Math.round(subtotal * (discount.value / 100));
                } else {
                    discountAmount = discount.value;
                }
                if (discountAmount > subtotal) discountAmount = subtotal;
            }
        }

        // --- Step 3: Totals ---
        const taxRate = 0.08;
        const shippingCost = subtotal > 500000 ? 0 : 30000;
        const taxableAmount = Math.max(0, subtotal - discountAmount);
        const taxAmount = Math.round(taxableAmount * taxRate);
        const totalAmount = taxableAmount + taxAmount + shippingCost;

        // --- Step 4: Create Order ---
        const { data: newOrder, error: orderError } = await adminSupabase
            .from('orders')
            .insert({
                user_id: finalUserId,
                shipping_address_id: finalAddressId,
                subtotal,
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

        await adminSupabase.from('order_items').insert(orderItemsToInsert);

        // --- Step 6: Link Discount ---
        if (discountId) {
            await adminSupabase.from('order_discounts').insert({ order_id: newOrder.id, discount_id: discountId });
        }

        // --- Step 7: Inventory Update ---
        for (const item of verifiedItems) {
            await adminSupabase.rpc('decrement_inventory', {
                p_variant_id: item.id,
                p_quantity: item.quantity
            });
        }

        // --- Step 8: Email ---
        if (process.env.RESEND_API_KEY) {
            resend.emails.send({
                from: 'Vietian Fashion <orders@vietianfashion.com>',
                to: ['customer@example.com'],
                subject: `Xác nhận đơn hàng #${newOrder.id}`,
                html: `<p>Mã đơn hàng: #${newOrder.id}</p>`
            }).catch(console.error);
        }

        // --- RETURN SUCCESS + COOKIE ---
        const response = NextResponse.json({ success: true, orderId: newOrder.id });

        // [FIX] Set secure cookie so Guest can view this specific order
        response.cookies.set({
            name: 'recent_order',
            value: newOrder.id.toString(),
            httpOnly: true,
            path: '/',
            maxAge: 3600, // 1 hour
            sameSite: 'lax'
        });

        return response;

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: error.message || 'Lỗi thanh toán' }, { status: 500 });
    }
}