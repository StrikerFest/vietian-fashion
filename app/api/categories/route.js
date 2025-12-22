// app/api/categories/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {cookies} from 'next/headers';
import { generateSlug } from '@/utils/format'; // [MODIFIED] Import Helper

export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    const {searchParams} = new URL(request.url);
    const type = searchParams.get('type'); // 'catalog' or 'attribute'
    const mode = searchParams.get('mode'); // 'public' or 'admin'

    try {
        let query = supabase
            .from('categories')
            .select('*')
            .is('deleted_at', null)
            .order('sort_order', {ascending: true})
            .order('name', {ascending: true});

        // 1. Filter by Type
        if (type) {
            query = query.eq('type', type);
        }

        // 2. Storefront Visibility Logic
        if (mode === 'public') {
            const now = new Date().toISOString();
            query = query.eq('is_active', true);
            query = query.or(`start_date.is.null,start_date.lte.${now}`);
            query = query.or(`end_date.is.null,end_date.gte.${now}`);
        }

        const {data, error} = await query;

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({error: 'Tải danh mục thất bại.', details: error.message}, {status: 500});
    }
}

// POST (Create Category) - LOCKED TO ADMIN
export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    const {data: {session}} = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const body = await request.json();
    const {
        name, description, parent_id, type = 'catalog', display_style = 'list',
        value, is_active = true, sort_order = 0, start_date, end_date, seo_title, seo_description
    } = body;

    if (!name) return NextResponse.json({error: 'Yêu cầu Tên danh mục'}, {status: 400});

    // [MODIFIED] Use shared helper + Prefer manually entered slug if available
    const slug = generateSlug(body.slug || name);

    try {
        // Check existing
        const {data: existing, error: checkError} = await supabase
            .from('categories')
            .select('id, deleted_at')
            .eq('slug', slug)
            .eq('type', type)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
            if (existing.deleted_at) {
                // Restore
                const {data: restored, error: restoreError} = await supabase
                    .from('categories')
                    .update({
                        deleted_at: null,
                        description: description || null,
                        parent_id: parent_id || null,
                        display_style,
                        value: value || null,
                        is_active,
                        sort_order,
                        start_date: start_date || null,
                        end_date: end_date || null,
                        seo_title: seo_title || null,
                        seo_description: seo_description || null
                    })
                    .eq('id', existing.id)
                    .select().single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                return NextResponse.json({error: 'Danh mục đã tồn tại.'}, {status: 409});
            }
        }

        // Create new
        const {data, error} = await supabase
            .from('categories')
            .insert([{
                name, slug, description, parent_id: parent_id || null, type,
                display_style, value: value || null, is_active, sort_order,
                start_date: start_date || null, end_date: end_date || null,
                seo_title: seo_title || null, seo_description: seo_description || null
            }])
            .select().single();

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }
}