// app/admin/AdminSidebar.js
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
// --- MODIFIED: Import the new admin hook ---
import { useAdminAuth } from '@/context/AdminAuthContext';

// @unchanged (adminLinks array)
const adminLinks = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Products', href: '/admin/products' },
    { name: 'Orders', href: '/admin/orders' },
    { name: 'Categories', href: '/admin/categories' },
    { name: 'Collections', href: '/admin/collections' },
    { name: 'Discounts', href: '/admin/discounts' },
    { name: 'Reviews', href: '/admin/reviews' },
    { name: 'Returns', href: '/admin/returns' },
    { name: 'Suppliers', href: '/admin/suppliers' },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    // --- MODIFIED: Use the new admin hook and its functions ---
    const { session, logout } = useAdminAuth();

    const handleLogout = () => {
        // --- MODIFIED: Call the custom admin logout function ---
        logout();
        // After logout, redirect to the admin login page
        router.push('/admin/login');
    };

    return (
        <div className="w-64 h-screen bg-gray-800 text-white flex flex-col fixed top-0 left-0">
            {/* @unchanged (Logo/Header) */}
            <div className="p-4 border-b border-gray-700">
                <Link href="/admin" className="text-xl font-bold">
                    AI Store Admin
                </Link>
            </div>

            {/* @unchanged (Navigation Links) */}
            <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                {adminLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`
                                block w-full text-left py-2 px-3 rounded-md text-sm font-medium
                                ${
                                    isActive
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }
                            `}
                        >
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            {/* --- MODIFIED: User/Logout Section --- */}
            <div className="p-4 border-t border-gray-700">
                {session ? ( // Check for the admin session
                    <div className="space-y-2">
                        <p className="text-sm text-gray-400 truncate" title={session.user.email}>
                            Signed in as: {session.user.email}
                        </p>
                        <button
                            onClick={handleLogout}
                            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-3 rounded-md text-sm"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Not logged in.</p>
                )}
                 {/* @unchanged (Link back to storefront) */}
                <Link href="/" className="mt-4 block text-center text-xs text-indigo-400 hover:text-indigo-300">
                    &larr; Back to Storefront
                </Link>
            </div>
        </div>
    );
}