// components/Navbar.js
'use client';

import {useState, useEffect, useRef} from 'react';
import Link from 'next/link';
import {useCart} from '@/context/CartContext';
import {useAuth} from '@/context/AuthContext';
import {useRouter} from 'next/navigation';

export default function Navbar() {
    const {cartItems} = useCart();
    const {session, supabase} = useAuth();
    const router = useRouter();

    // Data State
    const [navItems, setNavItems] = useState([]);

    // UI State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef(null);

    // Fetch Categories
    useEffect(() => {
        const fetchNavItems = async () => {
            try {
                const response = await fetch('/api/categories?type=catalog&mode=public');
                const data = await response.json();

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

    // Focus input when search opens
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        setIsMobileMenuOpen(false);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setIsSearchOpen(false);
            return;
        }

        // Redirect to search page with Keyword Mode
        router.push(`/search?q=${encodeURIComponent(searchQuery)}&mode=keyword`);
        setIsSearchOpen(false);
        setSearchQuery('');
    };

    return (
        <nav className="bg-gray-800 text-white p-4 sticky top-0 z-50 border-b border-gray-700">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center h-10">

                    {/* 1. Logo & Mobile Toggle */}
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden text-gray-300 hover:text-white focus:outline-none"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                                )}
                            </svg>
                        </button>

                        <Link href="/" className="text-xl font-bold tracking-tight shrink-0">
                            Vietian Fashion
                        </Link>
                    </div>

                    {/* 2. Desktop Navigation (Hidden when Search is wide) */}
                    <div className={`hidden md:flex items-center space-x-6 transition-opacity duration-200 ${isSearchOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                        {navItems.map(item => (
                            <div key={item.id} className="relative group">
                                <Link href={`/categories/${item.slug}`} className="hover:text-indigo-400 py-2 font-medium text-sm whitespace-nowrap">
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
                        <Link href="/products" className="hover:text-indigo-400 font-medium text-sm whitespace-nowrap">Tất cả sản phẩm</Link>
                    </div>

                    {/* 3. Right Side: Search + Cart + Auth */}
                    <div className="flex items-center gap-2 md:gap-4 flex-1 md:flex-none justify-end">

                        {/* --- NEW: Expandable Search Bar --- */}
                        <div className={`flex items-center transition-all duration-300 ease-in-out ${isSearchOpen ? 'w-full md:w-64 bg-gray-700 rounded-full px-3' : 'w-8'}`}>
                            {/* Search Icon (Click to Open) */}
                            <button
                                onClick={() => !isSearchOpen && setIsSearchOpen(true)}
                                className={`text-gray-300 hover:text-white focus:outline-none p-1 ${isSearchOpen ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                            </button>

                            {/* Input Field (Visible only when open) */}
                            {isSearchOpen && (
                                <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center ml-2">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onBlur={() => !searchQuery && setIsSearchOpen(false)} // Auto-close if empty
                                        placeholder="Tìm kiếm..."
                                        className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSearchOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className="text-gray-400 hover:text-white text-lg leading-none px-1"
                                    >
                                        &times;
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Cart Icon */}
                        <Link href="/cart" className="relative p-2 hover:bg-gray-700 rounded-full transition-colors shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            {cartItems.length > 0 && (
                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                                    {cartItems.reduce((count, item) => count + item.quantity, 0)}
                                </span>
                            )}
                        </Link>

                        {/* Auth (Desktop) */}
                        <div className="hidden md:flex items-center gap-4 shrink-0">
                            {session ? (
                                <>
                                    <Link href="/account" className="text-sm hover:text-indigo-400 font-medium">Tài khoản</Link>
                                    <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Đăng xuất</button>
                                </>
                            ) : (
                                <Link href="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">
                                    Đăng nhập
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
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
                            Tất cả sản phẩm
                        </Link>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                        {session ? (
                            <div className="space-y-3 px-2">
                                <Link href="/account" className="block text-gray-200" onClick={() => setIsMobileMenuOpen(false)}>Tài khoản của tôi</Link>
                                <button onClick={handleLogout} className="block text-gray-400">Đăng xuất</button>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="block w-full text-center bg-indigo-600 text-white py-2 rounded-md font-bold"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Đăng nhập
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}