// app/api/collections/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {cookies} from 'next/headers';
import { generateSlug } from '@/utils/format'; // [MODIFIED] Import Helper

// GET all active collections (Public)
export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    const {searchParams} = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        let query = supabase
            .from('collections')
            .select('*', {count: 'exact'})
            .is('deleted_at', null)
            .order('name', {ascending: true})
            .range(start, end);

        if (search) query = query.ilike('name', `%${search}%`);

        const {data, error, count} = await query;
        if (error) throw error;

        return NextResponse.json({
            data,
            meta: {page, limit, total: count, totalPages: Math.ceil((count || 0) / limit)}
        });

    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }
}

// POST (Create Collection) - LOCKED TO ADMIN
export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    const {data: {session}} = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {name, description, is_featured, seo_title, seo_description} = await request.json();

    if (!name) return NextResponse.json({error: 'Yêu cầu Tên'}, {status: 400});

    // [MODIFIED] Use shared helper
    const slug = generateSlug(name);

    try {
        // Check existing
        const {data: existing, error: checkError} = await supabase
            .from('collections')
            .select('id, deleted_at')
            .or(`name.eq.${name},slug.eq.${slug}`)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
            if (existing.deleted_at) {
                // Restore
                const {data: restored, error: restoreError} = await supabase
                    .from('collections')
                    .update({
                        deleted_at: null,
                        description: description || null,
                        is_featured: !!is_featured,
                        seo_title: seo_title || null,
                        seo_description: seo_description || null
                    })
                    .eq('id', existing.id)
                    .select().single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                return NextResponse.json({error: 'Bộ sưu tập đã tồn tại.'}, {status: 409});
            }
        }

        // Create new
        const {data, error} = await supabase
            .from('collections')
            .insert([{
                name, slug, description, is_featured: !!is_featured,
                seo_title: seo_title || null, seo_description: seo_description || null
            }])
            .select().single();

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }
}