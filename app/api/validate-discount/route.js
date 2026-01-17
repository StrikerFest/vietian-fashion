// app/api/validate-discount/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { code } = await request.json();

    if (!code) {
        return NextResponse.json({ error: 'Yêu cầu mã giảm giá.' }, { status: 400 });
    }

    const uppercaseCode = code.toUpperCase(); // Compare with uppercase code stored in DB
    const now = new Date(); // Get current date and time for validation

    try {
        const { data: discount, error } = await supabase
            .from('discounts') 
            .select('*')
            .eq('code', uppercaseCode) // Match the code
            .single(); // Expect only one or zero results

        if (error || !discount) {
            // Error occurred or no discount found with that code
            return NextResponse.json({ error: 'Mã giảm giá không hợp lệ.' }, { status: 404 });
        }

        // Check if the discount is active
        if (!discount.is_active) { 
            return NextResponse.json({ error: 'Mã giảm giá này không hoạt động.' }, { status: 400 });
        }

        // Check start date (if it exists)
        if (discount.start_date && new Date(discount.start_date) > now) { 
            return NextResponse.json({ error: 'Mã giảm giá này chưa đến ngày kích hoạt.' }, { status: 400 });
        }

        // Check end date (if it exists)
        if (discount.end_date && new Date(discount.end_date) < now) { 
            return NextResponse.json({ error: 'Mã giảm giá này đã hết hạn.' }, { status: 400 });
        }

        // If all checks pass, the discount is valid
        return NextResponse.json({ discount }); // Return the valid discount details

    } catch (error) {
        // Handle unexpected errors
        console.error('Error validating discount code:', error);
        return NextResponse.json({ error: 'Failed to validate discount code.', details: error.message }, { status: 500 });
    }
}
