// app/reset-password/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function ResetPasswordPage() {
    const { supabase, session } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordUpdated, setIsPasswordUpdated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // This page relies on the Supabase deep link setting the session/user via the URL hash (#token)
        // If a session exists, the user is authorized to update their password.
        if (session && !isPasswordUpdated) {
            setError(null);
        } else if (!session) {
            // User likely navigated directly or token expired.
            setError("Session token not found or expired. Please request a new reset link.");
        }
    }, [session, isPasswordUpdated]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            const mismatchError = "Passwords do not match.";
            setError(mismatchError);
            addToast(mismatchError, 'error');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            const lengthError = "Password must be at least 6 characters.";
            setError(lengthError);
            addToast(lengthError, 'error');
            setIsLoading(false);
            return;
        }

        try {
            // This relies on the session already being set by the Supabase redirect hook
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            setIsPasswordUpdated(true);
            addToast('Password updated successfully! You can now log in.', 'success');
            // Wait briefly before redirecting
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (err) {
            setError(err.message);
            addToast(`Error updating password: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const isAuthorized = session && !isPasswordUpdated;

    return (
        <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
                <h1 className="text-3xl font-bold text-center mb-2 text-white">
                    {isPasswordUpdated ? 'Success' : 'New Password'}
                </h1>

                {isPasswordUpdated && (
                    <div className="text-center my-8">
                        <p className="text-green-400 text-lg font-medium">Your password has been successfully reset.</p>
                        <p className="text-gray-400 mt-2">Redirecting to login...</p>
                    </div>
                )}

                {!isPasswordUpdated && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-900/30 text-red-200 p-3 rounded text-sm text-center border border-red-800">
                                {error}
                            </div>
                        )}

                        {!isAuthorized && (
                            <div className="bg-yellow-900/30 text-yellow-200 p-3 rounded text-sm text-center border border-yellow-800">
                                Please use the link provided in your email to access this page.
                            </div>
                        )}

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-gray-300">New Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={!isAuthorized || isLoading}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5 text-gray-300">Confirm New Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={!isAuthorized || isLoading}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!isAuthorized || isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg transition-all duration-200 disabled:bg-gray-700 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-900/50"
                        >
                            {isLoading ? 'Updating...' : 'Set New Password'}
                        </button>
                    </form>
                )}

                <p className="mt-6 text-center text-sm text-gray-400">
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                        Return to Login
                    </Link>
                </p>
            </div>
        </main>
    );
}