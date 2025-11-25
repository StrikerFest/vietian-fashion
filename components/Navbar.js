// components/Navbar.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const { cartItems } = useCart();
    const [navItems, setNavItems] = useState([]); // Renamed from categories to navItems
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { session, supabase } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const fetchNavItems = async () => {
            try {
                // --- CHANGED: Fetch only 'catalog' items visible to public ---
                const response = await fetch('/api/categories?type=catalog&mode=public');
                const data = await response.json();

                // Build hierarchy (Parents -> Children)
                const itemMap = {};
                const topLevelItems = [];

                data.forEach(item => {
                    item.children = [];
                    itemMap[item.id] = item;
                    if (item.parent_id) {
                        if (itemMap[item.parent_id]) {
                            itemMap[item.parent_id].children.push(item);
                        }
                    } else {
                        topLevelItems.push(item);
                    }
                });
                setNavItems(topLevelItems);
            } catch (error) {
                console.error("Failed to fetch nav items:", error);
            }
        };
        fetchNavItems();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className="bg-gray-800 text-white p-4 sticky top-0 z-50 border-b border-gray-700">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    {/* Logo & Mobile Toggle */}
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden text-gray-300 hover:text-white focus:outline-none"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>

                        <Link href="/" className="text-xl font-bold tracking-tight">
                            AI Fashion
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        {navItems.map(item => (
                            <div key={item.id} className="relative group">
                                <Link href={`/categories/${item.slug}`} className="hover:text-indigo-400 py-2 font-medium text-sm">
                                    {item.name}
                                </Link>
                                {item.children.length > 0 && (
                                    <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-xl py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 invisible group-hover:visible z-50">
                                        {item.children.map(child => (
                                            <Link key={child.id} href={`/categories/${item.slug}/${child.slug}`} className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 hover:text-white">
                                                {child.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <Link href="/products" className="hover:text-indigo-400 font-medium text-sm">All Products</Link>
                    </div>

                    {/* Right Icons (Cart/Auth) - Unchanged */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link href="/cart" className="relative p-2 hover:bg-gray-700 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {cartItems.length > 0 && (
                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                                    {cartItems.reduce((count, item) => count + item.quantity, 0)}
                                </span>
                            )}
                        </Link>

                        {session ? (
                            <div className="flex items-center gap-4">
                                <Link href="/account" className="text-sm hover:text-indigo-400 font-medium">My Account</Link>
                                <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
                            </div>
                        ) : (
                            <Link href="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">
                                Login
                            </Link>
                        )}
                    </div>

                    {/* Mobile Cart Icon - Unchanged */}
                    <div className="md:hidden">
                        <Link href="/cart" className="relative p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {cartItems.length > 0 && (
                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full">
                                    {cartItems.reduce((count, item) => count + item.quantity, 0)}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile Menu - Updated with navItems */}
            {isMobileMenuOpen && (
                <div className="md:hidden mt-4 border-t border-gray-700 pt-4 space-y-4">
                    <div className="space-y-2">
                        {navItems.map(item => (
                            <div key={item.id}>
                                <Link
                                    href={`/categories/${item.slug}`}
                                    className="block px-2 py-1 text-gray-200 font-medium"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item.name}
                                </Link>
                                {item.children.map(child => (
                                    <Link
                                        key={child.id}
                                        href={`/categories/${item.slug}/${child.slug}`}
                                        className="block px-6 py-1 text-sm text-gray-400"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {child.name}
                                    </Link>
                                ))}
                            </div>
                        ))}
                        <Link
                            href="/products"
                            className="block px-2 py-1 font-medium text-indigo-400"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            All Products
                        </Link>
                    </div>

                    {/* Auth Mobile */}
                    <div className="border-t border-gray-700 pt-4">
                        {session ? (
                            <div className="space-y-3 px-2">
                                <Link href="/account" className="block text-gray-200" onClick={() => setIsMobileMenuOpen(false)}>My Account</Link>
                                <button onClick={handleLogout} className="block text-gray-400">Logout</button>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="block w-full text-center bg-indigo-600 text-white py-2 rounded-md font-bold"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}