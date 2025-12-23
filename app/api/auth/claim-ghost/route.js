// app/api/auth/claim-ghost/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    // 1. Setup Admin Client
    const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
    }
    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { persistSession: false } }
    );

    try {
        const { email } = await request.json();

        // 2. Check if user exists in public.users AND has the ghost marker
        const { data: user, error } = await adminSupabase
            .from('users')
            .select('id, first_name')
            .eq('email', email)
            .single();

        if (error || !user) {
            // User not found in public table, or error
            return NextResponse.json({ isGhost: false });
        }

        // 3. Check for marker
        const isGhost = user.first_name && user.first_name.startsWith('[!!GUEST]');

        if (isGhost) {
            // 4. Trigger Password Reset Email
            // This effectively "Claims" the account by letting them set a password
            const { error: resetError } = await adminSupabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${new URL(request.url).origin}/reset-password`,
            });

            if (resetError) throw resetError;

            // Optional: You might want to remove the marker now, or let them update their profile later.
            // For now, we leave it so we know they were originally a guest until they manually update it.

            return NextResponse.json({ isGhost: true });
        }

        return NextResponse.json({ isGhost: false });

    } catch (error) {
        console.error('Claim Ghost Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}