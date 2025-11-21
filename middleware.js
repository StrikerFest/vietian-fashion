import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Refresh session if expired
    const { data: { session } } = await supabase.auth.getSession();

    // 1. Protect /admin routes
    if (req.nextUrl.pathname.startsWith('/admin')) {

        // Allow access to login page
        if (req.nextUrl.pathname === '/admin/login') {
            // If already logged in as admin, redirect to dashboard
            if (session) {
                // Note: Ideally we verify the 'admin' role here too, but middleware
                // shouldn't do heavy DB calls. We rely on the page-level check for role,
                // but we can at least redirect authenticated users.
                // For now, let the login page handle the redirect if they are already admin.
                return res;
            }
            return res;
        }

        // If trying to access protected admin pages without a session
        if (!session) {
            return NextResponse.redirect(new URL('/admin/login', req.url));
        }

        // Optional: If you stored user role in metadata, you could check it here.
        // const role = session.user.user_metadata.role;
        // if (role !== 'admin') return NextResponse.redirect(new URL('/', req.url));
    }

    // 2. Protect Account routes
    if (req.nextUrl.pathname.startsWith('/account')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', req.url));
        }
    }

    return res;
}

export const config = {
    matcher: ['/admin/:path*', '/account/:path*', '/login', '/admin/login'],
};