// app/api/tags/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// PUT (Update)
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;
    const { name } = await request.json();

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // ----------------------------

    if (!id || !name) return NextResponse.json({ error: 'ID and Name required' }, { status: 400 });

    try {
        const { data, error } = await supabase
            .from('tags')
            .update({ name: name.toLowerCase().trim() })
            .eq('id', parseInt(id))
            .select()
            .single();

        if (error) {
            if (error.code === '23505') return NextResponse.json({ error: 'Name exists.' }, { status: 409 });
            throw error;
        }
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE (Archive)
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // ----------------------------

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const { error } = await supabase
            .from('tags')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', parseInt(id));

        if (error) throw error;
        return NextResponse.json({ message: 'Tag archived.' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}