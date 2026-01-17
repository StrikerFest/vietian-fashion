// app/api/admin/templates/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { name, type, subject, body_html } = await request.json();

    if (!name || !subject || !body_html) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('email_templates')
            .insert({ name, type, subject, body_html })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
