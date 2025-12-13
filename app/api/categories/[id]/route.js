// app/api/categories/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// PUT (update)
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // ----------------------------

    // FIX: Destructure ALL fields, including time fencing and taxonomy settings
    const body = await request.json();
    const {
        name,
        description,
        parent_id,
        type,               // Missing
        display_style,      // Missing
        value,              // Missing
        is_active,          // Missing
        sort_order,         // Missing
        start_date,         // Missing (Time fencing)
        end_date,           // Missing (Time fencing)
        seo_title,
        seo_description
    } = body;

    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    // Regenerate slug in case name changed
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        const { data, error } = await supabase
            .from('categories')
            .update({
                name,
                slug,
                description,
                parent_id: parent_id || null,
                type: type || 'catalog',
                display_style: display_style || 'list',
                value: value || null,
                is_active: is_active ?? true,
                sort_order: sort_order || 0,
                start_date: start_date || null, // FIX: Update start_date
                end_date: end_date || null,     // FIX: Update end_date
                seo_title: seo_title || null,
                seo_description: seo_description || null
            })
            .eq('id', parseInt(id))
            .select().single();

        if (error) {
            if (error.code === '23505') return NextResponse.json({ error: 'Danh mục đã tồn tại.' }, { status: 409 });
            throw error;
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error("Update Category Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE (Archive)
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // ----------------------------

    try {
        const { error } = await supabase
            .from('categories')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', parseInt(id));

        if (error) throw error;
        return NextResponse.json({ message: 'Đã lưu trữ danh mục.' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}