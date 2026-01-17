// app/api/orders/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to replace {{variables}} in text
const processTemplate = (text, variables) => {
    if (!text) return '';
    let processed = text;
    Object.keys(variables).forEach(key => {
        // Replace {{key}} case-insensitively
        const regex = new RegExp(`{{${key}}}`, 'gi');
        processed = processed.replace(regex, variables[key] || '');
    });
    return processed;
};

// ... [Keep GET handler unchanged] ...
export async function GET(request, context) {
    const params = await context.params;
    const { id } = params;
    const orderId = parseInt(id);

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Auth Check
    const { data: { session } } = await supabase.auth.getSession();

    // 2. Cookie Check (For Guests)
    const recentOrderCookie = cookieStore.get('recent_order');
    const isGuestAccess = recentOrderCookie && parseInt(recentOrderCookie.value) === orderId;

    let orderData = null;
    let orderError = null;

    if (session) {
        // Authenticated: Standard fetch
        const res = await supabase
            .from('orders')
            .select(`
                *,
                tax_amount, shipping_cost, 
                order_discounts ( discounts ( code, type, value ) ),
                addresses ( * ),
                order_items (
                    id, quantity, price_at_purchase, custom_options,
                    product_variants (
                        id, sku, products ( name, image_url ),
                        variant_attributes ( attribute_value:categories ( name, parent:parent_id ( name ) ) )
                    )
                )
            `)
            .eq('id', orderId)
            .single();
        orderData = res.data;
        orderError = res.error;
    }
    else if (isGuestAccess) {
        // Guest with Cookie: Use Admin Client
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        );

        const res = await adminSupabase
            .from('orders')
            .select(`
                *,
                tax_amount, shipping_cost, 
                order_discounts ( discounts ( code, type, value ) ),
                addresses ( * ),
                order_items (
                    id, quantity, price_at_purchase, custom_options,
                    product_variants (
                        id, sku, products ( name, image_url ),
                        variant_attributes ( attribute_value:categories ( name, parent:parent_id ( name ) ) )
                    )
                )
            `)
            .eq('id', orderId)
            .single();

        if (res.data) {
            orderData = res.data;
        } else {
            orderError = res.error || { message: 'Order not found' };
        }
    }
    else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (orderError || !orderData) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const formattedOrder = {
        ...orderData,
        tax_amount: orderData.tax_amount || 0,
        shipping_cost: orderData.shipping_cost || 0,
        order_items: orderData.order_items.map(item => {
            const attributes = {};
            item.product_variants?.variant_attributes?.forEach(va => {
                if (va.attribute_value?.parent?.name) {
                    attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                }
            });
            return {
                ...item,
                product_variants: { ...item.product_variants, attributes }
            };
        })
    };

    return NextResponse.json(formattedOrder);
}

export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const orderId = parseInt(id);

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Check Admin Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();

        // 2. Update Order
        const { data: updatedOrderRaw, error } = await supabase
            .from('orders')
            .update(body)
            .eq('id', orderId)
            .select(`
                *,
                user:user_id(email, first_name, last_name),
                addresses:shipping_address_id ( * ),
                order_items (
                    id, quantity, price_at_purchase, returned_quantity, custom_options,
                    product_variants (
                        id, sku, products ( name, image_url ),
                        variant_attributes ( attribute_value:categories ( name, parent:parent_id ( name ) ) )
                    )
                )
            `)
            .single();

        if (error) {
            console.error('Order Update Error:', error);
            throw error;
        }

        // --- DATA TRANSFORMATION ---
        const updatedOrder = {
            ...updatedOrderRaw,
            tax_amount: updatedOrderRaw.tax_amount || 0,
            shipping_cost: updatedOrderRaw.shipping_cost || 0,
            order_items: updatedOrderRaw.order_items.map(item => {
                const attributes = {};
                item.product_variants?.variant_attributes?.forEach(va => {
                    if (va.attribute_value?.parent?.name) {
                        attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                    }
                });
                return {
                    ...item,
                    product_variants: { ...item.product_variants, attributes }
                };
            })
        };

        // 3. Send Notification Email
        const userEmail = updatedOrder.order_email || updatedOrder.user?.email;

        if (userEmail && body.status) {
            try {
                // Determine Template Type based on status
                const templateType = `order_${body.status}`; // e.g., order_paid, order_shipped

                // Fetch Template from DB using 'type' and 'body_html'
                const { data: template } = await supabase
                    .from('email_templates')
                    .select('*')
                    .eq('type', templateType)
                    .eq('is_active', true)
                    .maybeSingle(); // Use maybeSingle to avoid 406 error if not found

                // Prepare Variables
                const customerName = updatedOrder.user 
                    ? `${updatedOrder.user.first_name} ${updatedOrder.user.last_name}`.trim() 
                    : 'Khách hàng';

                const variables = {
                    order_id: updatedOrder.id,
                    customer_name: customerName,
                    total_amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(updatedOrder.total_amount),
                    shipping_carrier: updatedOrder.shipping_carrier || 'Đơn vị vận chuyển',
                    tracking_number: updatedOrder.tracking_number || 'Chưa cập nhật',
                    status: updatedOrder.status,
                    site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://vietianfashion.com'
                };

                let subject = '';
                let htmlContent = '';

                if (template) {
                    // USE DB TEMPLATE
                    subject = processTemplate(template.subject, variables);
                    htmlContent = processTemplate(template.body_html, variables);
                } else {
                    // FALLBACK
                    if (body.status === 'paid') {
                        subject = `Thanh toán thành công - Đơn hàng #${orderId}`;
                        htmlContent = `<p>Đã nhận được thanh toán cho đơn hàng #${orderId}. Tổng cộng: ${variables.total_amount}</p>`;
                    } else if (body.status === 'shipped') {
                        subject = `Đơn hàng #${orderId} đang được vận chuyển`;
                        htmlContent = `<p>Đơn hàng của bạn đang được giao bởi ${variables.shipping_carrier}. Mã vận đơn: ${variables.tracking_number}</p>`;
                    } else if (body.status === 'delivered') {
                        subject = `Giao hàng thành công - Đơn hàng #${orderId}`;
                        htmlContent = `<p>Đơn hàng #${orderId} đã được giao thành công.</p>`;
                    } else if (body.status === 'cancelled') {
                        subject = `Đơn hàng #${orderId} đã bị hủy`;
                        htmlContent = `<p>Đơn hàng #${orderId} đã bị hủy.</p>`;
                    }
                }

                // Send Email
                if (subject && htmlContent && process.env.RESEND_API_KEY) {
                    await resend.emails.send({
                        from: 'Vietian Fashion <orders@vietianfashion.com>',
                        to: [userEmail],
                        subject: subject,
                        html: htmlContent
                    });
                }
            } catch (emailErr) {
                console.error('Non-critical Email Error:', emailErr);
                // We don't throw here to avoid failing the whole update if just email fails
            }
        }

        return NextResponse.json({ order: updatedOrder });

    } catch (error) {
        console.error('PUT /api/orders/[id] Catch:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}