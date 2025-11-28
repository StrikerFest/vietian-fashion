// app/login/page.js
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AuthTabs from '@/components/auth/AuthTabs';
import AuthForm from '@/components/auth/AuthForm';

export default function LoginPage() {
    const { supabase, session, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isAuthLoading && session) {
            router.push('/');
        }
    }, [session, isAuthLoading, router]);

    // --- NEW: Handler for Password Mismatch from AuthForm ---
    const handlePasswordMismatch = () => {
        setMessage({ type: 'error', text: 'Error: Passwords do not match.' });
    };

    const handleAuth = async (formData) => {
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        const { email, password } = formData;
        let error = null;

        if (isSignUp) {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });
            error = signUpError;
            if (!error) {
                setMessage({ type: 'success', text: 'Sign up successful! Please check your email to confirm.' });
            }
        } else {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            error = signInError;
        }

        if (error) {
            setMessage({ type: 'error', text: error.message });
        }
        setIsLoading(false);
    };

    if (isAuthLoading || session) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><p>Redirecting...</p></div>;
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
                <h1 className="text-3xl font-bold text-center mb-2 text-white">
                    {isSignUp ? 'Join Us' : 'Welcome Back'}
                </h1>
                <p className="text-gray-400 text-center mb-8 text-sm">
                    {isSignUp ? 'Create an account to start shopping' : 'Sign in to access your account'}
                </p>

                <AuthTabs isSignUp={isSignUp} onChange={(val) => { setIsSignUp(val); setMessage({ type: '', text: '' }); }} />

                <AuthForm
                    isSignUp={isSignUp}
                    onSubmit={handleAuth}
                    isLoading={isLoading}
                    message={message}
                    onPasswordMismatch={handlePasswordMismatch} // --- MODIFIED: Pass new handler ---
                />
            </div>
        </main>
    );
}