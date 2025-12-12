// components/product/WishlistButton.js
'use client';

import { useWishlist } from '@/context/WishlistContext';

export default function WishlistButton({ productId, className = "" }) {
    const { isInWishlist, toggleWishlist } = useWishlist();
    const active = isInWishlist(productId);

    const handleClick = (e) => {
        e.preventDefault(); // Prevent clicking the parent ProductCard link
        e.stopPropagation();
        toggleWishlist(productId);
    };

    return (
        <button
            onClick={handleClick}
            className={`
                p-2 rounded-full transition-all duration-200 shadow-sm
                ${active
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'bg-gray-800/80 text-gray-300 hover:bg-white hover:text-red-500 backdrop-blur-sm'
            }
                ${className}
            `}
            title={active ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ${active ? 'fill-current' : 'fill-none'}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        </button>
    );
}