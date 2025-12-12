// app/admin/login/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// --- NEW: Import the custom admin auth hook ---
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminLoginPage() {
    // --- NEW: Use the admin auth context ---
    const { login, session, isLoading: isAuthLoading } = useAdminAuth();
    const router = useRouter();

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // UI state
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    // --- NEW: Redirect if already logged in as admin ---
    useEffect(() => {
        // If auth is not loading and an admin session *exists*, redirect to dashboard
        if (!isAuthLoading && session) {
            router.push('/admin');
        }
    }, [session, isAuthLoading, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // --- NEW: Call the custom login function from the context ---
            const { success } = await login(email, password);

            if (success) {
                // On success, redirect to the admin dashboard
                router.push('/admin');
            }
        } catch (error) {
            // The login function will throw an error if login fails or user is not admin
            setMessage({ type: 'error', text: error.message });
            setIsLoading(false);
        }
        // No need to set isLoading(false) on success, as we are redirecting
    };

    // Don't render the form if auth is loading or user is already logged in
    if (isAuthLoading || session) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <p>Đang chuyển hướng đến trang quản trị...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-xl">
                <h1 className="text-3xl font-bold text-center mb-6">
                    Đăng nhập Quản trị
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="admin@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-1">Mật khẩu</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* --- Display Messages --- */}
                    {message.text && (
                        <p className={`text-sm text-center ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                            {message.text}
                        </p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-md transition-colors disabled:bg-gray-500"
                        >
                            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}