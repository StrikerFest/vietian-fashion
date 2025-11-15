// app/login/page.js
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    // --- MODIFIED: Uses the customer useAuth hook ---
    const { supabase, session, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    // Form state
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI state
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false); // For the form button

    // --- MODIFIED: Redirect ALL logged-in users to homepage ---
    useEffect(() => {
        // Wait until auth is loaded
        if (!isAuthLoading && session) {
            // This is a customer, send them to the homepage
            router.push('/');
        }
    }, [session, isAuthLoading, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        if (isSignUp) {
            // --- UNCHANGED: Sign Up Logic ---
            if (password !== confirmPassword) {
                setMessage({ type: 'error', text: 'Passwords do not match.' });
                setIsLoading(false);
                return;
            }

            const { error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                setMessage({ type: 'error', text: error.message });
            } else {
                setMessage({ type: 'success', text: 'Sign up successful! Please check your email to confirm.' });
            }

        } else {
            // --- MODIFIED: Simplified Login Logic ---
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                setMessage({ type: 'error', text: error.message });
            }
            // No redirect here. The useEffect hook will catch the
            // session change and redirect to '/' automatically.
        }
        setIsLoading(false);
    };

    // --- MODIFIED: Use isAuthLoading from the customer context ---
    if (isAuthLoading || session) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><p>Redirecting...</p></div>;
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-xl">
                {/* --- MODIFIED: Title is for customers --- */}
                <h1 className="text-3xl font-bold text-center mb-6">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
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
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="••••••••"
                        />
                    </div>

                    {isSignUp && (
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

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
                            {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setMessage({ type: '', text: '' });
                        }}
                        className="text-sm text-indigo-400 hover:underline"
                    >
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </main>
    );
}