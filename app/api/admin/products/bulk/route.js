import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { ids, action } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !action) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let error;
        let responseData;

        switch (action) {
            case 'publish':
                ({ data: responseData, error } = await supabase
                    .from('products')
                    .update({ status: 'active' })
                    .in('id', ids)
                    .select());
                break;
            case 'draft':
                ({ data: responseData, error } = await supabase
                    .from('products')
                    .update({ status: 'draft' })
                    .in('id', ids)
                    .select());
                break;
            case 'delete':
                ({ data: responseData, error } = await supabase
                    .from('products')
                    .update({
                        deleted_at: new Date().toISOString(),
                        status: 'archived'
                    })
                    .in('id', ids)
                    .select());
                break;
            default:
                return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
        }

        if (error) throw error;

        return NextResponse.json({
            message: `Thành công! Đã áp dụng '${action}' cho ${responseData.length} sản phẩm.`,
            data: responseData
        });

    } catch (err) {
        console.error('Bulk Product Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
