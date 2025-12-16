// components/admin/AdminLoginForm.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminLoginForm() {
    const { login, isLoading: isAuthLoading } = useAdminAuth();
    const router = useRouter();

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // UI state
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { success } = await login(email, password);

            if (success) {
                // Successful login will update the session,
                // and the AdminAuthGuard (in layout.js) or this push will handle the redirect.
                router.push('/admin');
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            setIsLoading(false);
        }
    };

    return (
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
                        disabled={isLoading || isAuthLoading}
                        className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
                        disabled={isLoading || isAuthLoading}
                        className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        placeholder="••••••••"
                    />
                </div>

                {message.text && (
                    <p className={`text-sm text-center ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                        {message.text}
                    </p>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading || isAuthLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-md transition-colors disabled:bg-gray-500"
                    >
                        {isLoading || isAuthLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                    </button>
                </div>
            </form>
        </div>
    );
}