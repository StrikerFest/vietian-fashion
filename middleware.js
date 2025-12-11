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
    // Protects both /admin and /api/admin
    if (path.startsWith('/admin') || path.startsWith('/api/admin')) {

        // Allow access to login page
        if (path === '/admin/login') {
            if (session) {
                return NextResponse.redirect(new URL('/admin', req.url));
            }
            return res;
        }

        // If no session exists
        if (!session) {
            // API: Return 401 JSON
            if (path.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // Page: Redirect to login
            return NextResponse.redirect(new URL('/admin/login', req.url));
        }

        // Verify Admin Role (RBAC)
        const { data: userRole, error: roleError } = await supabase.rpc('get_user_role');

        if (roleError || userRole !== 'admin') {
            if (path.startsWith('/api/')) {
                return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
            }
            return NextResponse.redirect(new URL('/', req.url));
        }
    }

    // 2. ACCOUNT ROUTES (Pages & APIs) [SECURITY PATCH]
    // Now protects /api/account routes from unauthorized access
    if (path.startsWith('/account') || path.startsWith('/api/account')) {
        if (!session) {
            // API: Return 401 JSON (Don't redirect an AJAX call)
            if (path.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // Page: Redirect to login
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
        '/api/account/:path*', // <--- CRITICAL: Ensures the middleware actually runs for these APIs
        '/login',
        '/admin/login'
    ],
};