// app/admin/layout.js
'use client'; // This layout *must* be a client component

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
// --- NEW: Import the new AdminAuthProvider and hook ---
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import AdminSidebar from './AdminSidebar';

/**
 * This component consumes the auth state to protect the routes.
 */
function AdminAuthGuard({ children }) {
    const { session, isLoading, userRole } = useAdminAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading) {
            // If auth is loaded...
            if (!session || userRole !== 'admin') {
                // And user is not an admin, redirect to admin login
                // (but don't redirect if we are *already* on the login page)
                if (pathname !== '/admin/login') {
                    router.push('/admin/login');
                }
            } else if (session && userRole === 'admin') {
                // If user IS an admin and is trying to visit the login page,
                // redirect them to the dashboard.
                if (pathname === '/admin/login') {
                    router.push('/admin');
                }
            }
        }
    }, [session, userRole, isLoading, router, pathname]);

    // Show loading state while auth is being checked
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <p>Loading admin resources...</p>
            </div>
        );
    }

    // --- NEW: Special case for the login page ---
    // If we are on the login page, render it *without* the sidebar.
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // If session is confirmed AND role is admin, show the full admin layout
    if (session && userRole === 'admin') {
        return (
            <div className="flex min-h-screen bg-gray-900 text-white">
                <AdminSidebar />
                <main className="flex-grow ml-64">
                    {children}
                </main>
            </div>
        );
    }

    // Fallback: user is not an admin but also not loading, show nothing
    // while the redirect in useEffect kicks in.
    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <p>Redirecting...</p>
        </div>
    );
}

/**
 * This is the root layout for the /admin section.
 * It wraps all admin pages in the AdminAuthProvider.
 */
export default function AdminLayout({ children }) {
    return (
        <AdminAuthProvider>
            <AdminAuthGuard>
                {children}
            </AdminAuthGuard>
        </AdminAuthProvider>
    );
}