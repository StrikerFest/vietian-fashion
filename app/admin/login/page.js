// app/admin/login/page.js
'use client';

import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminLoginPage() {
    const { isLoading, session } = useAdminAuth();

    // Optional: Show a loading state if the auth check is still running
    // to prevent the form from flashing briefly before redirecting (if already logged in)
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <p>Đang tải...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
            <AdminLoginForm />
        </main>
    );
}