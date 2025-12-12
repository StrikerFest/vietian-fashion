// app/admin/AdminSidebar.js
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';

const adminLinks = [
    { name: 'Bảng điều khiển', href: '/admin' },
    { name: 'Sản phẩm', href: '/admin/products' },
    { name: 'Tùy chọn sản phẩm', href: '/admin/options' },
    { name: 'Đơn hàng', href: '/admin/orders' },
    { name: 'Khách hàng', href: '/admin/users' },
    { name: 'Danh mục', href: '/admin/categories' },
    { name: 'Bộ sưu tập', href: '/admin/collections' },
    { name: 'Thẻ / Thuộc tính', href: '/admin/tags' },
    { name: 'Mã giảm giá', href: '/admin/discounts' },
    { name: 'Đánh giá', href: '/admin/reviews' },
    { name: 'Trả hàng', href: '/admin/returns' },
    { name: 'Nhà cung cấp', href: '/admin/suppliers' },
    { name: 'Đơn nhập hàng', href: '/admin/purchase-orders' },
    { name: 'Nhật ký tồn kho', href: '/admin/inventory' },
    { name: 'Cài đặt', href: '/admin/settings' },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { session, logout } = useAdminAuth();

    const handleLogout = () => {
        logout();
        router.push('/admin/login');
    };

    return (
        <div className="w-64 h-screen bg-gray-800 text-white flex flex-col fixed top-0 left-0">
            <div className="p-4 border-b border-gray-700">
                <Link href="/admin" className="text-xl font-bold">
                    Quản trị AI Store
                </Link>
            </div>

            <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
                {adminLinks.map((link) => {
                    const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`
                                block w-full text-left py-2 px-3 rounded-md text-sm font-medium transition-colors
                                ${isActive
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                            `}
                        >
                            {link.name}
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