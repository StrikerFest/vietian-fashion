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
        // [FIX] REMOVED the automatic redirect from /admin/login to /admin
        // This prevents the infinite loop if the client-side thinks the user isn't an admin yet.
        // We allow the user to stay on the login page; the client-side AdminLoginPage will handle
        // the redirect if the user is actually an authorized admin.

        // If trying to access protected admin pages (excluding login) without session
        if (path !== '/admin/login') {
            if (!session) {
                if (path.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
                return NextResponse.redirect(new URL('/admin/login', req.url));
            }

            // Verify role for protected admin routes
            const { data: userRole, error: roleError } = await supabase.rpc('get_user_role');
            if (roleError || userRole !== 'admin') {
                if (path.startsWith('/api/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                // If user exists but is not admin, redirect to home instead of login to avoid loop
                return NextResponse.redirect(new URL('/', req.url));
            }
        }
    }

    // 2. ACCOUNT ROUTES (Pages & APIs)
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