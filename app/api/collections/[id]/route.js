// app/api/collections/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// PUT (Update)
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // ----------------------------

    const { name, description, is_featured, seo_title, seo_description } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        const { data, error } = await supabase
            .from('collections')
            .update({ name, slug, description, is_featured: !!is_featured, seo_title, seo_description })
            .eq('id', parseInt(id))
            .select().single();

        if (error) {
            if (error.code === '23505') return NextResponse.json({ error: 'Exists.' }, { status: 409 });
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

    try {
        const { error } = await supabase
            .from('collections')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', parseInt(id));

        if (error) throw error;
        return NextResponse.json({ message: 'Collection archived.' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}