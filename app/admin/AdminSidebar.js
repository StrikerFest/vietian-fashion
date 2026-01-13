// app/admin/AdminSidebar.js
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useState, useEffect } from 'react';

const adminLinks = [
    { name: 'Bảng điều khiển', href: '/admin' },
    { name: 'Sản phẩm', href: '/admin/products' },
    { name: 'Tùy chọn sản phẩm', href: '/admin/options' },
    { name: 'Đơn hàng', href: '/admin/orders' },
    { name: 'Khách hàng', href: '/admin/users' },
    { name: 'Danh mục', href: '/admin/categories' },
    { name: 'Bộ sưu tập', href: '/admin/collections' },
    { name: 'Mã giảm giá', href: '/admin/discounts' },
    { name: 'Đánh giá', href: '/admin/reviews' },
    { name: 'Trả hàng', href: '/admin/returns' },
    { name: 'Nhà cung cấp', href: '/admin/suppliers' },
    { name: 'Đơn nhập hàng', href: '/admin/purchase-orders' },
    { name: 'Nhật ký tồn kho', href: '/admin/inventory' },
    { name: 'Thùng rác', href: '/admin/recycle' },
    { name: 'Cài đặt', href: '/admin/settings' },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { session, logout } = useAdminAuth();
    const [loadingPath, setLoadingPath] = useState(null);

    // Reset loading state when navigation completes
    useEffect(() => {
        setLoadingPath(null);
    }, [pathname]);

    const handleLogout = () => {
        logout();
        router.push('/admin/login');
    };

    const handleLinkClick = (e, href) => {
        // Prevent navigation if the link is already the current page
        if (pathname === href) {
            e.preventDefault();
            return;
        }
        // Set loading state for the clicked link
        setLoadingPath(href);
    };

    return (
        <div className="w-64 h-screen bg-gray-800 text-white flex flex-col fixed top-0 left-0">
            <div className="p-4 border-b border-gray-700">
                <Link href="/admin" className="text-xl font-bold">
                    Quản trị Store
                </Link>
            </div>

            <nav className={`flex-grow p-4 space-y-1 overflow-y-auto ${loadingPath ? 'pointer-events-none' : ''}`}>
                {adminLinks.map((link) => {
                    const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                    const isLoading = loadingPath === link.href;

                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={(e) => handleLinkClick(e, link.href)}
                            className={`
                                relative block w-full text-left py-2 px-3 rounded-md text-sm font-medium transition-colors
                                ${isActive && !isLoading ? 'bg-indigo-600 text-white' : ''}
                                ${!isActive && !isLoading ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : ''}
                                ${isLoading ? 'bg-indigo-700 text-white pointer-events-auto cursor-default' : ''}
                                ${!isLoading && loadingPath ? 'pointer-events-none opacity-50' : 'pointer-events-auto'}
                            `}
                        >
                            {link.name}
                            {isLoading && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-900 overflow-hidden">
                                    <div className="animate-loader-bar h-full bg-indigo-400"></div>
                                </div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-700">
                {session ? (
                    <div className="space-y-2">
                        <p className="text-sm text-gray-400 truncate" title={session.user.email}>
                            {session.user.email}
                        </p>
                        <button
                            onClick={handleLogout}
                            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-3 rounded-md text-sm"
                        >
                            Đăng xuất
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Chưa đăng nhập.</p>
                )}
                <Link href="/" className="mt-4 block text-center text-xs text-indigo-400 hover:text-indigo-300">
                    &larr; Về trang chủ
                </Link>
            </div>
        </div>
    );
}