// components/Navbar.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
    const { cartItems } = useCart();
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('/api/categories');
                const data = await response.json();

                // Build the hierarchy from the flat list
                const categoryMap = {};
                const topLevelCategories = [];

                data.forEach(category => {
                    category.children = [];
                    categoryMap[category.id] = category;
                    if (category.parent_id) {
                        if (categoryMap[category.parent_id]) {
                            categoryMap[category.parent_id].children.push(category);
                        }
                    } else {
                        topLevelCategories.push(category);
                    }
                });

                setCategories(topLevelCategories);
            } catch (error) {
                console.error("Failed to fetch categories for navbar:", error);
            }
        };
        fetchCategories();
    }, []);

    return (
        <nav className="bg-gray-800 text-white p-4 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-8">
                    <Link href="/" className="text-xl font-bold">
                        AI Fashion
                    </Link>
                    {/* Dynamic Navigation Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {categories.map(category => (
                            <div key={category.id} className="relative group">
                                <Link href={`/categories/${category.slug}`} className="hover:text-indigo-400 p-2 rounded-md">
                                    {category.name}
                                </Link>
                                {category.children.length > 0 && (
                                    <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 invisible group-hover:visible">
                                        <div className="py-1">
                                            {category.children.map(child => (
                                                <Link key={child.id} href={`/categories/${category.slug}/${child.slug}`} className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">
                                                    {child.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <Link href="/products" className="hover:text-indigo-400 p-2 rounded-md">All Products</Link>
                    </div>
                </div>

                <Link href="/cart" className="relative p-2 rounded-md hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {cartItems.length > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                            {cartItems.length}
                        </span>
                    )}
                </Link>
            </div>
        </nav>
    );
}