// components/Footer.js
'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="col-span-1 md:col-span-1">
                    <h3 className="text-white text-lg font-bold mb-4">Vietian Fashion</h3>
                    <p className="text-sm mb-4">
                        Phong cách của bạn, được lựa chọn bởi trí tuệ nhân tạo. Khám phá tương lai của mua sắm thời trang.
                    </p>
                    <div className="flex space-x-4">
                        {/* Social Links - Redirecting to Login */}
                        <a 
                            href="https://x.com/login" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-indigo-600 transition-colors text-white"
                            title="X (Twitter)"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 7.71 8.502 11.25h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.235L1.248 2.25h6.834l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                        </a>
                        <a 
                            href="https://www.instagram.com/accounts/login/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors text-white"
                            title="Instagram"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </a>
                    </div>
                </div>

                {/* Links Column 1 */}
                <div>
                    <h4 className="text-white font-semibold mb-4">Mua sắm</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/products" className="hover:text-indigo-400 transition-colors">Tất cả sản phẩm</Link></li>
                        <li><Link href="/search?q=new&mode=keyword" className="hover:text-indigo-400 transition-colors">Hàng mới về</Link></li>
                        <li><Link href="/search?q=trending&mode=keyword" className="hover:text-indigo-400 transition-colors">Nổi bật</Link></li>
                    </ul>
                </div>

                {/* Links Column 2 */}
                <div>
                    <h4 className="text-white font-semibold mb-4">Hỗ trợ</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/account" className="hover:text-indigo-400 transition-colors">Tài khoản</Link></li>
                        <li><Link href="/account/returns" className="hover:text-indigo-400 transition-colors">Lịch sử trả hàng</Link></li>
                        <li><Link href="/cart" className="hover:text-indigo-400 transition-colors">Giỏ hàng</Link></li>
                    </ul>
                </div>

                {/* Newsletter */}
                <div>
                    <h4 className="text-white font-semibold mb-4">Cập nhật thông tin</h4>
                    <p className="text-xs mb-2">Đăng ký để nhận các bộ sưu tập và ưu đãi độc quyền.</p>
                    <div className="flex">
                        <input
                            type="email"
                            placeholder="Nhập email của bạn"
                            className="bg-gray-800 text-white text-sm rounded-l-md px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-r-md text-sm font-bold transition-colors">
                            →
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-xs text-center">
                &copy; {new Date().getFullYear()} Vietian Fashion. Đã đăng ký bản quyền.
            </div>
        </footer>
    );
}