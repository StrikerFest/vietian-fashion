// components/auth/AuthForm.js
'use client';

import { useState } from 'react';

export default function AuthForm({ isSignUp, onSubmit, isLoading, message, onPasswordMismatch }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSignUp && password !== confirmPassword) {
            onPasswordMismatch();
            return;
        }
        onSubmit({ email, password });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-gray-300">Địa chỉ Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="ban@example.com"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-gray-300">Mật khẩu</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                />
            </div>

            {isSignUp && (
                <div className="animate-fade-in">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5 text-gray-300">Xác nhận Mật khẩu</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                </div>
            )}

            {/* Message Display */}
            {message.text && (
                <div className={`p-3 rounded-md text-sm text-center ${
                    message.type === 'error' ? 'bg-red-900/30 text-red-200 border border-red-800' : 'bg-green-900/30 text-green-200 border border-green-800'
                }`}>
                    {message.text}
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:bg-gray-700 disabled:cursor-not-allowed disabled:scale-100 shadow-lg hover:shadow-indigo-900/50"
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Đang xử lý...
                    </span>
                ) : (
                    isSignUp ? 'Tạo tài khoản' : 'Đăng nhập'
                )}
            </button>
        </form>
    );
}