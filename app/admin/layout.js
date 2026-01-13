// app/admin/layout.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import AdminSidebar from './AdminSidebar';

function AdminAuthGuard({ children }) {
    const { session, isLoading, userRole } = useAdminAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        // Wait until the component has mounted and the auth state is resolved
        if (hasMounted && !isLoading) {
            const isAdminPage = pathname.startsWith('/admin');
            const isLoginPage = pathname === '/admin/login';
            const userIsAdmin = session && userRole === 'admin';

            // If user is not an admin and is trying to access an admin page (that isn't the login page)
            if (!userIsAdmin && isAdminPage && !isLoginPage) {
                router.push('/admin/login');
            }
            // If a logged-in admin is on the login page, redirect them to the dashboard
            else if (userIsAdmin && isLoginPage) {
                router.push('/admin');
            }
        }
    }, [session, userRole, isLoading, router, pathname, hasMounted]);

    // Show a loading screen while checking auth state or before the component has mounted
    if (!hasMounted || isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <p>Đang tải tài nguyên quản trị...</p>
            </div>
        );
    }

    // On the login page, just render the content without the sidebar
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // If the user is a logged-in admin, show the admin layout with sidebar
    if (session && userRole === 'admin') {
        return (
            <div className="flex min-h-screen bg-gray-900 text-white">
                <AdminSidebar />
                <main className="flex-grow ml-64 p-8"> {/* Added padding for content */}
                    {children}
                </main>
            </div>
        );
    }

    // Fallback for non-admin users trying to access protected pages (should be handled by redirect, but as a safeguard)
    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <p>Đang chuyển hướng...</p>
        </div>
    );
}

export default function AdminLayout({ children }) {
    return (
        <AdminAuthProvider>
            <AdminAuthGuard>
                {children}
            </AdminAuthGuard>
        </AdminAuthProvider>
    );
}