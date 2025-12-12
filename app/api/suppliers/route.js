// app/api/suppliers/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {cookies} from 'next/headers';

// GET all active suppliers
export async function GET() {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] ADMIN ONLY
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    // ----------------------------

    try {
        const {data, error} = await supabase
            .from('suppliers')
            .select('*')
            .is('deleted_at', null)
            .order('name', {ascending: true});

        if (error) throw error;
        return NextResponse.json(data || []);

    } catch (error) {
        return NextResponse.json({error: 'Failed to fetch suppliers.', details: error.message}, {status: 500});
    }
}

// POST a new supplier
export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] ADMIN ONLY
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    // ----------------------------

    const {name, contact_person, email, phone} = await request.json();

    if (!name) {
        return NextResponse.json({error: 'Yêu cầu Tên nhà cung cấp'}, {status: 400});
    }

    try {
        const {data: existing, error: checkError} = await supabase
            .from('suppliers')
            .select('*')
            .eq('name', name)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
            if (existing.deleted_at) {
                const {data: restored, error: restoreError} = await supabase
                    .from('suppliers')
                    .update({
                        deleted_at: null,
                        contact_person: contact_person || existing.contact_person,
                        email: email || existing.email,
                        phone: phone || existing.phone
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored, {status: 200});
            } else {
                return NextResponse.json({error: 'Nhà cung cấp với tên này đã tồn tại.'}, {status: 409});
            }
        }

        const {data, error} = await supabase
            .from('suppliers')
            .insert([{name, contact_person, email, phone}])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data, {status: 201});

    } catch (error) {
        return NextResponse.json({error: 'Tạo nhà cung cấp thất bại.', details: error.message}, {status: 500});
    }
}