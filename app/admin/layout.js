// app/admin/layout.js
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import AdminSidebar from './AdminSidebar';

function AdminAuthGuard({ children }) {
    const { session, isLoading, userRole } = useAdminAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading) {
            if (!session || userRole !== 'admin') {
                if (pathname !== '/admin/login') {
                    router.push('/admin/login');
                }
            } else if (session && userRole === 'admin') {
                if (pathname === '/admin/login') {
                    router.push('/admin');
                }
            }
        }
    }, [session, userRole, isLoading, router, pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <p>Đang tải tài nguyên quản trị...</p>
            </div>
        );
    }

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

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