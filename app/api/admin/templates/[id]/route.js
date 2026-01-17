// app/api/admin/templates/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { name, type, subject, body_html, is_active } = await request.json();

    try {
        const { data, error } = await supabase
            .from('email_templates')
            .update({ name, type, subject, body_html, is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { error } = await supabase
            .from('email_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ message: 'Đã xóa mẫu' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
