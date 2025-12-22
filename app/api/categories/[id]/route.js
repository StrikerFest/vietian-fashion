// app/api/categories/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateSlug } from '@/utils/format'; // [MODIFIED] Import Helper

export async function GET(request, context) {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data, error } = await supabase
        .from('categories')
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

    const body = await request.json();
    const {
        name, description, parent_id, display_style, value,
        is_active, sort_order, start_date, end_date, seo_title, seo_description
    } = body;

    // [MODIFIED] Intelligent Slug Logic
    // 1. If user provided a specific slug, sanitize it.
    // 2. If no slug provided, but name changed, generate from name.
    const slug = generateSlug(body.slug || name);

    try {
        // Check duplicate slug
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', slug)
            .neq('id', id)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Đường dẫn (Slug) đã tồn tại.' }, { status: 409 });
        }

        const { data, error } = await supabase
            .from('categories')
            .update({
                name,
                slug,
                description,
                parent_id: parent_id || null,
                display_style,
                value,
                is_active,
                sort_order,
                start_date: start_date || null,
                end_date: end_date || null,
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
        .from('categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}