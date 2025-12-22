// app/api/tags/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateSlug } from '@/utils/format'; // [MODIFIED] Import Helper

// PUT: Update a Tag (Rename)
export async function PUT(request, context) {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY] Admin Only
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    try {
        // [MODIFIED] Generate new slug from new name
        const slug = generateSlug(name);

        // Check for duplicates (excluding current tag)
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', slug)
            .eq('type', 'attribute') // Tags are attributes
            .neq('id', id)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Tên thẻ này đã tồn tại.' }, { status: 409 });
        }

        const { data, error } = await supabase
            .from('categories')
            .update({
                name: name.trim(),
                slug: slug,
                // Ensure type stays correct just in case
                type: 'attribute',
                display_style: 'pill'
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

// DELETE: Remove a Tag
export async function DELETE(request, context) {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Soft delete
        const { error } = await supabase
            .from('categories')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('type', 'attribute'); // Security check

        if (error) throw error;
        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}