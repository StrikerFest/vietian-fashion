// app/api/account/wishlist/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();

        // [FIX] For guests, just return empty list instead of 401 Error
        if (!session) {
            return NextResponse.json([]);
        }

        const { data, error } = await supabase
            .from('wishlists')
            .select(`
                product_id,
                products (
                    id, name, image_url, price: product_variants(price)
                )
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = data.map(item => ({
            ...item.products,
            price: item.products.price?.[0]?.price || 0
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        // POST still requires login
        if (!session) return NextResponse.json({ error: 'Vui lòng đăng nhập để lưu yêu thích' }, { status: 401 });

        const { product_id } = await request.json();

        const { error } = await supabase
            .from('wishlists')
            .insert({ user_id: session.user.id, product_id });

        if (error) {
            if (error.code === '23505') return NextResponse.json({ message: 'Sản phẩm đã có trong danh sách yêu thích' });
            throw error;
        }

        return NextResponse.json({ message: 'Đã thêm vào danh sách yêu thích' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const product_id = searchParams.get('productId');

        const { error } = await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', session.user.id)
            .eq('product_id', product_id);

        if (error) throw error;

        return NextResponse.json({ message: 'Đã xóa khỏi danh sách yêu thích' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}