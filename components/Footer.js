// components/Footer.js
'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="col-span-1 md:col-span-1">
                    <h3 className="text-white text-lg font-bold mb-4">AI Fashion</h3>
                    <p className="text-sm mb-4">
                        Your style, curated by intelligence. Discover the future of fashion shopping.
                    </p>
                    <div className="flex space-x-4">
                        {/* Social Placeholders */}
                        <span className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer">𝕏</span>
                        <span className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors cursor-pointer">IG</span>
                    </div>
                </div>

                {/* Links Column 1 */}
                <div>
                    <h4 className="text-white font-semibold mb-4">Shop</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/products" className="hover:text-indigo-400">All Products</Link></li>
                        <li><Link href="/categories/new-arrivals" className="hover:text-indigo-400">New Arrivals</Link></li>
                        <li><Link href="/collections/summer-vibes" className="hover:text-indigo-400">Featured</Link></li>
                    </ul>
                </div>

                {/* Links Column 2 */}
                <div>
                    <h4 className="text-white font-semibold mb-4">Support</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/account" className="hover:text-indigo-400">My Account</Link></li>
                        <li><Link href="/account/orders" className="hover:text-indigo-400">Order Status</Link></li>
                        <li><span className="cursor-not-allowed opacity-50">Returns (Coming Soon)</span></li>
                    </ul>
                </div>

                {/* Newsletter */}
                <div>
                    <h4 className="text-white font-semibold mb-4">Stay in the loop</h4>
                    <p className="text-xs mb-2">Sign up for AI-curated drops and exclusive offers.</p>
                    <div className="flex">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="bg-gray-800 text-white text-sm rounded-l-md px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-r-md text-sm font-bold transition-colors">
                            →
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-xs text-center">
                &copy; {new Date().getFullYear()} Vietian Fashion. All rights reserved.
            </div>
        </footer>
    );
}