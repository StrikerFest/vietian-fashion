// app/api/settings/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// [MODIFIED] Added 'payment_config' to public keys
const PUBLIC_KEYS = [
    'homepage_config',
    'ai_search_attributes',
    'site_name',
    'contact_email',
    'tax_config',
    'shipping_config',
    'payment_config', // <--- Added this so VietQRDisplay works for guests
    'guide_settings' // Size Charts & Care Instructions
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