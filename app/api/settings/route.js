import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {cookies} from 'next/headers';

export async function GET(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] ADMIN ONLY - Prevent configuration leakage
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    // -------------------------------------------------------------

    const {searchParams} = new URL(request.url);
    const key = searchParams.get('key');

    try {
        let query = supabase.from('settings').select('*');

        if (key) {
            query = query.eq('key', key).single();
        }

        const {data, error} = await query;

        if (error && error.code === 'PGRST116') {
            return NextResponse.json({value: null});
        }

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 500});
    }
}

export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] ADMIN ONLY - CRITICAL: Prevent unauthorized config changes
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    // ---------------------------------------------------------------------------

    const {key, value, description} = await request.json();

    try {
        const {data, error} = await supabase
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
        return NextResponse.json({error: error.message}, {status: 500});
    }
}