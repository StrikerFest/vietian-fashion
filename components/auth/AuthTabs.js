// components/auth/AuthTabs.js
'use client';

export default function AuthTabs({ isSignUp, onChange }) {
    return (
        <div className="flex border-b border-gray-700 mb-6">
            <button
                className={`flex-1 pb-4 text-center font-medium transition-colors ${
                    !isSignUp
                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                        : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => onChange(false)}
            >
                Đăng nhập
            </button>
            <button
                className={`flex-1 pb-4 text-center font-medium transition-colors ${
                    isSignUp
                        ? 'text-indigo-400 border-b-2 border-indigo-400'
                        : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => onChange(true)}
            >
                Đăng ký
            </button>
        </div>
    );
}