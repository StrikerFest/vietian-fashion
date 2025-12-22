// app/api/collections/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateSlug } from '@/utils/format'; // [MODIFIED] Import Helper

export async function GET(request, context) {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PUT(request, context) {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, description, is_featured, seo_title, seo_description } = await request.json();

    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    // [MODIFIED] Auto-generate slug from name
    const slug = generateSlug(name);

    try {
        const { data: existing } = await supabase
            .from('collections')
            .select('id')
            .eq('slug', slug)
            .neq('id', id)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Bộ sưu tập (Slug) đã tồn tại.' }, { status: 409 });
        }

        const { data, error } = await supabase
            .from('collections')
            .update({
                name,
                slug,
                description,
                is_featured: !!is_featured,
                seo_title: seo_title || null,
                seo_description: seo_description || null
            })
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
    const { id } = await context.params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
        .from('collections')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}