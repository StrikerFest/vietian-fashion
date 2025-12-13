// app/api/account/addresses/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
        }

        const { data: addresses, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(addresses);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        return NextResponse.json({ error: 'Lỗi tải danh sách địa chỉ' }, { status: 500 });
    }
}

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });

        const body = await request.json();
        const { address_line_1, address_line_2, city, state, postal_code, country, is_default } = body;

        if (!address_line_1 || !city || !state || !postal_code || !country) {
            return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        if (is_default) {
            await supabase.from('addresses').update({ is_default: false }).eq('user_id', session.user.id);
        }

        const { data, error } = await supabase
            .from('addresses')
            .insert({
                user_id: session.user.id,
                address_line_1,
                address_line_2,
                city,
                state_province_region: state,
                postal_code,
                country,
                is_default: is_default || false
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Tạo địa chỉ thất bại' }, { status: 500 });
    }
}