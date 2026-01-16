import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { ids, action } = await request.json();

    console.log(`[Bulk Action] Action: ${action}, IDs:`, ids);

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !action) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ: Yêu cầu ID và hành động.' }, { status: 400 });
    }

    // Check Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

                // Step 2: Unlink products
                await supabase
                    .from('product_categories')
                    .delete()
                    .in('category_id', ids);

                // Step 3: Soft delete
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

        console.log(`[Bulk Action Result] Action: ${action}, Success: ${!error}, Rows: ${responseData?.length}, Error:`, error);

        if (error) {
            console.error('Lỗi Supabase:', error);
            throw new Error(error.message);
        }

        return NextResponse.json({
            message: `Thực hiện thành công hành động '${action}' trên ${responseData ? responseData.length : 0} mục.`,
            data: responseData
        });

    } catch (error) {
        console.error('[Bulk API Catch Error]:', error);
        return NextResponse.json({ error: `Thao tác thất bại: ${error.message}` }, { status: 500 });
    }
}
