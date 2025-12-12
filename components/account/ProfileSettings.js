// components/account/ProfileSettings.js
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function ProfileSettings() {
    const { session, supabase } = useAuth();
    const { addToast } = useToast();

    // Simple profile fields (for demo/future implementation)
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Placeholder fetch (assuming you will hydrate these from API)
    // useEffect(() => { /* fetch user profile details */ }, []);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Placeholder: Implement API call to update user details in the 'users' table
            // For example:
            // await fetch('/api/account/profile', { method: 'PUT', body: JSON.stringify({ firstName, lastName }) });

            addToast('Cập nhật hồ sơ thành công! (Demo)', 'success');
        } catch (error) {
            addToast(`Lỗi cập nhật hồ sơ: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangePassword = async () => {
        // Use the Supabase built-in flow for security
        // This will send a password reset email to the logged-in user's address.
        const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
            redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) {
            addToast(`Lỗi khởi tạo đổi mật khẩu: ${error.message}`, 'error');
        } else {
            addToast('Đã gửi liên kết đổi mật khẩu! Vui lòng kiểm tra email.', 'success');
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">Cài đặt hồ sơ</h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* Email (Read-only) */}
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-400">Email (Chỉ đọc)</label>
                    <input
                        type="email"
                        value={session.user.email}
                        disabled
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-gray-400 text-sm cursor-not-allowed"
                    />
                </div>

                {/* Name fields (Placeholder) */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Tên</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Họ</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded disabled:bg-gray-600 transition-colors"
                >
                    {isSubmitting ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
                </button>
            </form>

            <div className="pt-4 mt-4 border-t border-gray-700">
                <p className="text-sm font-bold text-gray-400 mb-2">Bảo mật</p>
                <button
                    onClick={handleChangePassword}
                    className="w-full text-left text-sm text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                >
                    Yêu cầu email đổi mật khẩu
                </button>
            </div>
        </div>
    );
}