// middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Refresh session if expired
    const { data: { session } } = await supabase.auth.getSession();
    const path = req.nextUrl.pathname;

    // 1. ADMIN ROUTES (Pages & APIs)
    if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
        if (path === '/admin/login') {
            if (session) return NextResponse.redirect(new URL('/admin', req.url));
            return res;
        }

        if (!session) {
            if (path.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            return NextResponse.redirect(new URL('/admin/login', req.url));
        }

        const { data: userRole, error: roleError } = await supabase.rpc('get_user_role');
        if (roleError || userRole !== 'admin') {
            if (path.startsWith('/api/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            return NextResponse.redirect(new URL('/', req.url));
        }
    }

    // 2. ACCOUNT ROUTES (Pages & APIs)
    // [FIX] Allow public access to Wishlist API (it handles guests internally)
    if ((path.startsWith('/account') || path.startsWith('/api/account')) && !path.startsWith('/api/account/wishlist')) {
        if (!session) {
            if (path.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            return NextResponse.redirect(new URL('/login', req.url));
        }
    }

    return res;
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/api/admin/:path*',
        '/account/:path*',
        '/api/account/:path*',
        '/login',
        '/admin/login'
    ],
};