// app/api/tags/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {cookies} from 'next/headers';

// GET all active tags (Publicly accessible for filters)
export async function GET() {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    try {
        const {data, error} = await supabase
            .from('tags')
            .select('*')
            .is('deleted_at', null) // Only fetch active records
            .order('name', {ascending: true});

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching tags:', error);
        return NextResponse.json({error: 'Failed to fetch tags.', details: error.message}, {status: 500});
    }
}

// POST a new tag (ADMIN ONLY)
export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] Verify Admin Session
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }
    // ------------------------------------

    const {name} = await request.json();

    if (!name) {
        return NextResponse.json({error: 'Yêu cầu Tên thẻ'}, {status: 400});
    }

    const tagName = name.toLowerCase().trim();

    try {
        // Check for existing tag (active or archived)
        const {data: existingTag, error: checkError} = await supabase
            .from('tags')
            .select('id, deleted_at')
            .eq('name', tagName)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingTag) {
            if (existingTag.deleted_at) {
                // Restore archived tag
                const {data: restored, error: restoreError} = await supabase
                    .from('tags')
                    .update({deleted_at: null})
                    .eq('id', existingTag.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                // Tag exists and is active
                return NextResponse.json({error: 'Thẻ đã tồn tại.'}, {status: 409});
            }
        }

        // Create new tag
        const {data, error} = await supabase
            .from('tags')
            .insert([{name: tagName}])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating tag:', error);
        return NextResponse.json({error: 'Tạo thẻ thất bại.', details: error.message}, {status: 500});
    }
}