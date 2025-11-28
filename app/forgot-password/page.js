// app/forgot-password/page.js
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function ForgotPasswordPage() {
    const { supabase } = useAuth();
    const { addToast } = useToast();

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        // Supabase sends the email and redirects the user to the URL set in the
        // Supabase project settings (usually the root URL), which then routes to /reset-password
        // using the hash token in the URL.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) {
            addToast(error.message, 'error');
            setMessage({ type: 'error', text: error.message });
        } else {
            const successMsg = 'Password reset link sent! Check your email (and spam folder) for instructions.';
            addToast(successMsg, 'success');
            setMessage({ type: 'success', text: successMsg });
            setEmail('');
        }
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
                <h1 className="text-3xl font-bold text-center mb-2 text-white">
                    Reset Password
                </h1>
                <p className="text-gray-400 text-center mb-8 text-sm">
                    Enter your email to receive a password reset link.
                </p>

                {message && (
                    <div className={`p-3 rounded-md text-sm text-center mb-4 ${
                        message.type === 'error' ? 'bg-red-900/30 text-red-200 border border-red-800' : 'bg-green-900/30 text-green-200 border border-green-800'
                    }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-gray-300">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg transition-all duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-900/50"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Sending Link...
                            </span>
                        ) : 'Send Reset Link'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                        Back to Sign In
                    </Link>
                </p>
            </div>
        </main>
    );
}