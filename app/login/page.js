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

    const handlePasswordMismatch = () => {
        setMessage({ type: 'error', text: 'Lỗi: Mật khẩu không khớp.' });
    };

    const handleAuth = async (formData) => {
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        const { email, password } = formData;
        let error = null;

        if (isSignUp) {
            // 1. Attempt Standard Sign Up
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            });

            if (signUpError) {
                // 2. Check if error is "User already registered"
                // Supabase error message for this is usually "User already registered"
                if (signUpError.message.includes('already registered') || signUpError.status === 422) { // 422 is common for duplicate

                    try {
                        // 3. Check if it's a Ghost Account via our API
                        const checkResponse = await fetch('/api/auth/claim-ghost', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                        });

                        const checkData = await checkResponse.json();

                        if (checkData.isGhost) {
                            setMessage({
                                type: 'success',
                                text: 'Email này đã được tạo tự động từ đơn hàng trước đây. Chúng tôi đã gửi liên kết đặt lại mật khẩu vào email để bạn kích hoạt tài khoản.'
                            });
                            // Stop here, don't show the generic error
                            setIsLoading(false);
                            return;
                        }
                    } catch (ghostCheckError) {
                        console.error("Ghost check failed", ghostCheckError);
                        // Fall through to show original error
                    }
                }

                // If not ghost or check failed, show original error
                error = signUpError;
            } else {
                setMessage({ type: 'success', text: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.' });
            }
        } else {
            // Standard Sign In
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
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><p>Đang chuyển hướng...</p></div>;
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
                <h1 className="text-3xl font-bold text-center mb-2 text-white">
                    {isSignUp ? 'Tham gia cùng chúng tôi' : 'Chào mừng trở lại'}
                </h1>
                <p className="text-gray-400 text-center mb-8 text-sm">
                    {isSignUp ? 'Tạo tài khoản để bắt đầu mua sắm' : 'Đăng nhập để truy cập tài khoản của bạn'}
                </p>

                <AuthTabs isSignUp={isSignUp} onChange={(val) => { setIsSignUp(val); setMessage({ type: '', text: '' }); }} />

                <AuthForm
                    isSignUp={isSignUp}
                    onSubmit={handleAuth}
                    isLoading={isLoading}
                    message={message}
                    onPasswordMismatch={handlePasswordMismatch}
                />
            </div>
        </main>
    );
}