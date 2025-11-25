import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    try {
        let query = supabase.from('settings').select('*');

        if (key) {
            query = query.eq('key', key).single();
        }

        const { data, error } = await query;

        // If specific key requested but not found, return null data instead of 500
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