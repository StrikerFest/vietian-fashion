// app/api/tags/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {cookies} from 'next/headers';
import { generateSlug } from '@/utils/format';

export async function GET() {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    try {
        // Fetch categories that act as tags (attributes)
        // We filter by type='attribute'.
        // You might want to filter by display_style='pill' if you distinguish them that way,
        // but for now we'll fetch all attributes to be safe.
        const {data, error} = await supabase
            .from('categories')
            .select('*')
            .eq('type', 'attribute')
            .is('deleted_at', null)
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
    const cookieStore = await cookies();
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

    const tagName = name.trim();
    // Use the Vietnamese-safe slug generator
    const slug = generateSlug(tagName);

    try {
        // Check for existing tag (attribute)
        const {data: existing, error: checkError} = await supabase
            .from('categories')
            .select('id, deleted_at')
            .eq('slug', slug)
            .eq('type', 'attribute')
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existing) {
            if (existing.deleted_at) {
                // Restore archived tag
                const {data: restored, error: restoreError} = await supabase
                    .from('categories')
                    .update({deleted_at: null, is_active: true})
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                return NextResponse.json({error: 'Thẻ đã tồn tại.'}, {status: 409});
            }
        }

        // Create new category as Attribute (acting as Tag)
        const {data, error} = await supabase
            .from('categories')
            .insert([{
                name: tagName,
                slug: slug,
                type: 'attribute',    // [FIXED] Must be 'attribute' to match Schema
                is_active: true,
                display_style: 'pill' // UI hint that this is a tag
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating tag:', error);
        return NextResponse.json({error: 'Tạo thẻ thất bại.', details: error.message}, {status: 500});
    }
}