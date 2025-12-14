// app/api/admin/notify-wishlist/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    const { product_id, discount_text } = await request.json();

    if (!product_id || !discount_text) {
        return NextResponse.json({ error: 'Yêu cầu ID sản phẩm và nội dung giảm giá' }, { status: 400 });
    }

    try {
        // 1. Fetch Product
        const { data: product } = await supabase.from('products').select('name').eq('id', product_id).single();
        if (!product) throw new Error("Không tìm thấy sản phẩm");

        // 2. Find Users who wishlisted this product
        const { data: wishlists } = await supabase
            .from('wishlists')
            .select('user_id, users(email, first_name)')
            .eq('product_id', product_id);

        if (!wishlists || wishlists.length === 0) {
            return NextResponse.json({ message: 'Không có người dùng nào thích sản phẩm này.' });
        }

        // 3. Get the "Wishlist Sale" Template
        const { data: template } = await supabase
            .from('email_templates')
            .select('*')
            .eq('type', 'wishlist_sale')
            .eq('is_active', true)
            .single();

        if (!template) throw new Error("Không tìm thấy mẫu email 'wishlist_sale' đang hoạt động.");

        // 4. Get Sender Configuration (Dynamic)
        const { data: emailSettings } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'email_config')
            .single();

        // Fallback defaults if settings aren't configured yet
        const senderName = emailSettings?.value?.senderName || 'Vietian Fashion';
        const senderEmail = emailSettings?.value?.senderEmail || 'sales@your-domain.com';
        const fromAddress = `${senderName} <${senderEmail}>`;

        // 5. Prepare Emails
        const emailBatch = wishlists.map(item => {
            const user = item.users;
            const filledBody = template.body_html
                .replace(/{{customer_name}}/g, user.first_name || 'Bạn')
                .replace(/{{product_name}}/g, product.name)
                .replace(/{{discount_text}}/g, discount_text);

            const filledSubject = template.subject
                .replace(/{{product_name}}/g, product.name);

            return {
                from: fromAddress, // Used dynamic address
                to: user.email,
                subject: filledSubject,
                html: filledBody
            };
        });

        // 6. Send
        const { data, error } = await resend.batch.send(emailBatch);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Đã gửi thông báo giảm giá đến ${wishlists.length} khách hàng.`,
            data
        });

    } catch (error) {
        console.error("Notification error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}