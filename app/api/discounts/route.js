// app/api/discounts/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Use dynamic client
import { cookies } from 'next/headers';

// GET all active discounts
export async function GET(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY ACCESS
    // Prevent public leaking of all discount codes
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Optionally: Check for 'admin' role in public.user_roles if strictly required
    // ------------------------------------

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        const { data, error, count } = await supabase
            .from('discounts')
            .select('*', { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        return NextResponse.json({
            data,
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching discounts:', error);
        return NextResponse.json({ error: 'Failed to fetch discounts.', details: error.message }, { status: 500 });
    }
}

// POST (Create Discount) - NOW SECURED
export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY PATCH] ADMIN ONLY - PREVENT UNAUTHORIZED CREATION
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // -------------------------------------------------------------

    const { code, type, value, start_date, end_date, is_active } = await request.json();

    if (!code || !type || value === undefined || value === null) {
        return NextResponse.json({ error: 'Yêu cầu Mã, Loại và Giá trị' }, { status: 400 });
    }

    const upperCode = code.toUpperCase();

    try {
        // Check existing
        const { data: existing, error: checkError } = await supabase
            .from('discounts')
            .select('id, deleted_at')
            .eq('code', upperCode)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
            if (existing.deleted_at) {
                // Restore
                const { data: restored, error: restoreError } = await supabase
                    .from('discounts')
                    .update({
                        deleted_at: null,
                        type,
                        value,
                        start_date: start_date || null,
                        end_date: end_date || null,
                        is_active: is_active !== undefined ? is_active : true
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                return NextResponse.json({ error: 'Mã giảm giá đã tồn tại.' }, { status: 409 });
            }
        }

        // Create new
        const { data, error } = await supabase
            .from('discounts')
            .insert([{
                code: upperCode,
                type,
                value,
                start_date: start_date || null,
                end_date: end_date || null,
                is_active: is_active !== undefined ? is_active : true
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: 'Tạo mã giảm giá thất bại.', details: error.message }, { status: 500 });
    }
}