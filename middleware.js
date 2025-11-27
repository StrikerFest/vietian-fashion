import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Refresh session if expired
    const { data: { session } } = await supabase.auth.getSession();
    const path = req.nextUrl.pathname;

    // 1. Protect /admin routes (Pages and APIs)
    if (path.startsWith('/admin') || path.startsWith('/api/admin')) {

        // Allow access to login page explicitly
        if (path === '/admin/login') {
            // If already logged in, redirect to dashboard
            if (session) {
                return NextResponse.redirect(new URL('/admin', req.url));
            }
            return res;
        }

        // If no session exists
        if (!session) {
            // A. API Routes: Return 401 JSON (don't return HTML redirect)
            if (path.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // B. Pages: Redirect to login
            return NextResponse.redirect(new URL('/admin/login', req.url));
        }
    }

    // 2. Protect Account routes
    if (path.startsWith('/account')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', req.url));
        }
    }

    return res;
}

export const config = {
    // Added '/api/admin/:path*' to ensure admin APIs are protected
    matcher: ['/admin/:path*', '/api/admin/:path*', '/account/:path*', '/login', '/admin/login'],
};