
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const ENTITY_CONFIG = {
    products: { table: 'products', select: 'id, name, image_url, deleted_at, status', search: 'name' },
    categories: { table: 'categories', select: 'id, name, type, deleted_at', search: 'name' },
    collections: { table: 'collections', select: 'id, name, deleted_at', search: 'name' },
    discounts: { table: 'discounts', select: 'id, code, type, value, deleted_at', search: 'code' },
    suppliers: { table: 'suppliers', select: 'id, name, contact_person, deleted_at', search: 'name' },
    users: { table: 'users', select: 'id, email, first_name, last_name, deleted_at', search: 'email' },
    reviews: { table: 'reviews', select: 'id, rating, comment, product_id, deleted_at', search: 'comment' },
};

export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { searchParams } = new URL(request.url);

    // Check Admin Permission
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entityKey = searchParams.get('entity');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const config = ENTITY_CONFIG[entityKey];
    if (!config) {
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        let query = supabase
            .from(config.table)
            .select(config.select, { count: 'exact' })
            .not('deleted_at', 'is', null) // Only fetch soft-deleted
            .order('deleted_at', { ascending: false })
            .range(start, end);

        if (search) {
            query = query.ilike(config.search, `%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return NextResponse.json({
            data,
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Recycle Bin Fetch Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity, ids, action, restore_mode } = await request.json(); // restore_mode: 'active' | 'draft'

    const config = ENTITY_CONFIG[entity];
    if (!config) {
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    try {
        if (action === 'restore') {
            const updatePayload = { deleted_at: null };

            // Apply Status Logic based on Entity and Restore Mode
            if (entity === 'products') {
                updatePayload.status = (restore_mode === 'active') ? 'active' : 'draft';
            } else if (entity === 'categories' || entity === 'discounts') {
                updatePayload.is_active = (restore_mode === 'active');
            } else if (entity === 'reviews') {
                updatePayload.is_approved = (restore_mode === 'active');
            }

            const { error } = await supabase
                .from(config.table)
                .update(updatePayload)
                .in('id', ids);
            
            if (error) throw error;
            return NextResponse.json({ message: `Successfully restored ${ids.length} items.` });

        } else if (action === 'permanent_delete') {
            const { error } = await supabase
                .from(config.table)
                .delete()
                .in('id', ids);
            
            if (error) throw error;
            return NextResponse.json({ message: `Permanently deleted ${ids.length} items.` });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Recycle Bin Action Error:', error);
        // Handle FK constraint errors gracefully
        if (error.code === '23503') {
            return NextResponse.json({ error: 'Cannot delete items because they are referenced by other records (e.g., Orders).' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
