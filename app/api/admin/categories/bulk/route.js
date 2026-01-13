// app/api/admin/categories/bulk/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { ids, action } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !action) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ: Yêu cầu ID và hành động.' }, { status: 400 });
    }

    try {
        let responseData;
        let error;

        switch (action) {
            case 'enable':
                ({ data: responseData, error } = await supabase
                    .from('categories')
                    .update({ is_active: true })
                    .in('id', ids)
                    .select());
                break;
            case 'disable':
                ({ data: responseData, error } = await supabase
                    .from('categories')
                    .update({ is_active: false })
                    .in('id', ids)
                    .select());
                break;
            case 'delete':
                // Step 1: Unlink children (set parent_id to null)
                await supabase
                    .from('categories')
                    .update({ parent_id: null })
                    .in('parent_id', ids);

                // Step 2: Unlink products (remove from product_categories junction table)
                await supabase
                    .from('product_categories')
                    .delete()
                    .in('category_id', ids);

                // Step 3: Soft delete the categories
                ({ data: responseData, error } = await supabase
                    .from('categories')
                    .update({
                        deleted_at: new Date().toISOString(),
                        is_active: false
                    })
                    .in('id', ids)
                    .select());
                break;
            default:
                return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
        }

        if (error) {
            console.error('Lỗi Supabase:', error);
            throw new Error(error.message);
        }

        return NextResponse.json({
            message: `Thực hiện thành công hành động '${action}' trên ${responseData.length} mục.`,
            data: responseData
        });

    } catch (error) {
        return NextResponse.json({ error: `Thao tác thất bại: ${error.message}` }, { status: 500 });
    }
}