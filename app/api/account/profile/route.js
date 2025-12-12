// app/api/account/profile/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });

        const { data: user, error } = await supabase
            .from('users')
            .select('first_name, last_name, phone, email')
            .eq('id', session.user.id)
            .single();

        if (error) throw error;

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });

        const { first_name, last_name, phone } = await request.json();

        const { error } = await supabase
            .from('users')
            .update({ first_name, last_name, phone })
            .eq('id', session.user.id);

        if (error) throw error;

        return NextResponse.json({ message: 'Cập nhật hồ sơ thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}