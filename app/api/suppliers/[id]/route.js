// app/api/suppliers/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Switch to dynamic client
import { cookies } from 'next/headers';

// PUT (update) a single supplier
export async function PUT(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ----------------------------

    const { name, contact_person, email, phone } = await request.json();

    if (!name) {
        return NextResponse.json({ error: 'Supplier Name is required' }, { status: 400 });
    }
    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Supplier ID is required.' }, { status: 400 });
    }
    const numericSupplierId = parseInt(id);

    try {
        const { data, error } = await supabase
            .from('suppliers')
            .update({
                name,
                contact_person: contact_person || null,
                email: email || null,
                phone: phone || null,
            })
            .eq('id', numericSupplierId)
            .select()
            .single();

        if (error) {
            // Preserve your specific duplicate name check
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Nhà cung cấp với tên này đã tồn tại.' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error(`Error updating supplier ${numericSupplierId}:`, error);
        return NextResponse.json({ error: 'Cập nhật nhà cung cấp thất bại.', details: error.message }, { status: 500 });
    }
}

// DELETE (Archive) a single supplier
export async function DELETE(request, context) {
    const params = await context.params;
    const { id } = params;

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ----------------------------

    if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ error: 'Valid Supplier ID is required.' }, { status: 400 });
    }
    const numericSupplierId = parseInt(id);

    try {
        const { error } = await supabase
            .from('suppliers')
            .update({ deleted_at: new Date().toISOString() }) // Soft Delete
            .eq('id', numericSupplierId);

        if (error) throw error;

        return NextResponse.json({ message: 'Lưu trữ nhà cung cấp thành công.' });

    } catch (error) {
        console.error(`Error archiving supplier ${numericSupplierId}:`, error);
        return NextResponse.json({ error: 'Lưu trữ nhà cung cấp thất bại.', details: error.message }, { status: 500 });
    }
}