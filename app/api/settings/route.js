// app/api/settings/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// [FIX] Define keys that are SAFE for the public to read
const PUBLIC_KEYS = [
    'homepage_config',      // Required for Homepage Banners/Layout
    'ai_search_attributes', // Required for AI Search
    'site_name',
    'contact_email',
    'tax_config',           // Required for Cart/Checkout calculation
    'shipping_config'       // Required for Cart/Checkout calculation
];

export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // [SECURITY CHECK]
    // 1. Check if the requested key is in the Public Whitelist
    const isPublicRequest = key && PUBLIC_KEYS.includes(key);

    // 2. If NOT public, enforce Admin Session
    if (!isPublicRequest) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        let query = supabase.from('settings').select('*');

        if (key) {
            query = query.eq('key', key).single();
        }

        const { data, error } = await query;

        if (error && error.code === 'PGRST116') {
            return NextResponse.json({ value: null });
        }

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // [SECURITY] POST/WRITE is always strictly Admin-only
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { key, value, description } = await request.json();

    try {
        const { data, error } = await supabase
            .from('settings')
            .upsert({
                key,
                value,
                description,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}