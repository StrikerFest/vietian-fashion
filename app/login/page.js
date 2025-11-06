// app/login/page.js
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Import the new hook
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { supabase, session } = useAuth(); // Get Supabase client and session
    const router = useRouter();

    // Form state
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Sign Up
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI state
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if user is already logged in
    useEffect(() => {
        if (session) {
            router.push('/'); // Redirect to homepage
        }
    }, [session, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' }); // Clear previous messages

        if (isSignUp) {
            // --- Sign Up Logic ---
            if (password !== confirmPassword) {
                setMessage({ type: 'error', text: 'Passwords do not match.' });
                setIsLoading(false);
                return;
            }

            const { error } = await supabase.auth.signUp({
                email: email,
                password: password,
                // You can add 'options' here, like user metadata
                // options: {
                //   data: {
                //     first_name: 'Test', // This would require modifying your users table
                //   }
                // }
            });

            if (error) {
                setMessage({ type: 'error', text: error.message });
            } else {
                // Supabase sends a confirmation email by default
                // You might have this disabled in your Supabase settings
                setMessage({ type: 'success', text: 'Sign up successful! Please check your email to confirm.' });
            }

        } else {
            // --- Login Logic ---
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                setMessage({ type: 'error', text: error.message });
            }
            // No need for a success message, the useEffect will redirect
        }
        setIsLoading(false);
    };

    // Don't render the form if the session is loading or already exists
    if (session) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><p>Redirecting...</p></div>;
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-xl">
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
                            minLength={6} // Supabase default minimum
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
                            {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setMessage({ type: '', text: '' }); // Clear messages on toggle
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