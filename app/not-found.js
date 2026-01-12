'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center">
            {/* AI-themed 404 Visual */}
            <div className="mb-8 relative">
                <div className="text-9xl font-black text-gray-800 select-none">404</div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl animate-pulse">🛰️</span>
                </div>
            </div>

            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Tín hiệu bị mất
            </h1>
            
            <p className="text-gray-400 max-w-md mb-10 leading-relaxed">
                Hệ thống AI của chúng tôi không thể định vị được trang bạn đang tìm kiếm. Có thể nó đã được di chuyển hoặc không còn tồn tại.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                    href="/" 
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20"
                >
                    Về Trang Chủ
                </Link>
                <Link 
                    href="/products" 
                    className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg border border-gray-700 transition-all"
                >
                    Xem Sản Phẩm
                </Link>
            </div>

            {/* Subtle Grid Pattern Background */}
            <div className="fixed inset-0 -z-10 opacity-20 pointer-events-none overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #374151 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            </div>
        </main>
    );
}