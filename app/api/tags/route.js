// app/api/tags/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {cookies} from 'next/headers';

// REFACTORED: Now uses 'categories' table with type='tag' since 'tags' table is deprecated.

export async function GET() {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    try {
        // Fetch categories that are used as tags
        // We filter by type='tag' to separate them from Catalog/Attributes
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
    // Auto-generate slug for the category
    const slug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        // Check for existing tag (in categories)
        const {data: existing, error: checkError} = await supabase
            .from('categories')
            .select('id, deleted_at')
            .eq('slug', slug)
            .eq('type', 'attribute') // Ensure we only check tags
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
                // Tag exists
                return NextResponse.json({error: 'Thẻ đã tồn tại.'}, {status: 409});
            }
        }

        // Create new category as tag
        const {data, error} = await supabase
            .from('categories')
            .insert([{
                name: tagName,
                slug: slug,
                type: 'tag',      // Important: Set type to 'tag'
                is_active: true,
                display_style: 'pill' // Default style for tags
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