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

    // [MODIFIED] Intelligent Duplicate Detection
    const idealSlug = generateSlug(name);
    const providedSlug = body.slug ? generateSlug(body.slug) : idealSlug;
    
    // Check for:
    // 1. Exact slug provided
    // 2. Ideal slug (from name)
    // 3. Base slug (if provided slug has numeric suffix like 'tag-123' -> 'tag')
    const slugsToCheck = new Set([providedSlug, idealSlug]);
    const baseSlug = providedSlug.replace(/-\d+$/, '');
    if (baseSlug !== providedSlug) slugsToCheck.add(baseSlug);

    try {
        const { data: existingCandidates, error: checkError } = await supabase
            .from('categories')
            .select('*')
            .in('slug', Array.from(slugsToCheck))
            .eq('type', type); // Must match type

        if (checkError) throw checkError;

        // Find the best match
        let match = null;
        if (existingCandidates && existingCandidates.length > 0) {
            // 1. Prefer Exact/Ideal Slug match
            match = existingCandidates.find(c => c.slug === idealSlug || c.slug === providedSlug);
            
            // 2. If not found, check base slug (user passed tag-123, but tag exists)
            if (!match) match = existingCandidates.find(c => c.slug === baseSlug);
            
            // 3. IMPORTANT: Check Parent ID consistency?
            // If we found 'Cotton' (parent: Material), and we are creating 'Cotton' (parent: Style),
            // we CANNOT reuse it. Slugs must be unique globally. 
            // However, the user issue implies duplicates in the SAME context.
            // If parent_id doesn't match, we might fall through to create (which will fail unique constraint unless we suffix).
            // But here we want to catch the "Same Context" duplicates.
            if (match) {
                // If parents differ (and both aren't null), it's a genuine collision, not a duplicate to reuse.
                // Treat null and undefined as same.
                const matchPid = match.parent_id || null;
                const newPid = parent_id || null;
                
                if (matchPid !== newPid) {
                    // Collision with different group. Cannot reuse.
                    // Proceed to creation logic (which will likely fail or require new slug)
                    match = null; 
                }
            }
        }

        if (match) {
            if (match.deleted_at) {
                // Restore
                const { data: restored, error: restoreError } = await supabase
                    .from('categories')
                    .update({
                        deleted_at: null,
                        description: description || match.description,
                        // Update other fields if provided, else keep existing
                        is_active: is_active ?? match.is_active,
                        sort_order: sort_order ?? match.sort_order
                    })
                    .eq('id', match.id)
                    .select().single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                // Already exists and active. Return it.
                return NextResponse.json(match);
            }
        }

        // Create new (Use idealSlug if providedSlug was just a random suffix version of it)
        // If providedSlug was 'tag-123' and we didn't find 'tag', we create 'tag-123'?
        // The user wants to avoid 'tag-123' if 'tag' is available.
        // If we are here, 'tag' (idealSlug) does NOT exist.
        // So we should try to create 'tag' (idealSlug) first.
        
        const finalSlug = idealSlug; // Force ideal slug to prevent random suffix if it was passed by client

        const {data, error} = await supabase
            .from('categories')
            .insert([{
                name, 
                slug: finalSlug, 
                description, 
                parent_id: parent_id || null, 
                type,
                display_style, value: value || null, is_active, sort_order,
                start_date: start_date || null, end_date: end_date || null,
                seo_title: seo_title || null, seo_description: seo_description || null
            }])
            .select().single();

        if (error) {
            // If creation fails (e.g. race condition), throw
            throw error;
        }
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }
}