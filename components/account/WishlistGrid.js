// components/account/WishlistGrid.js
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

export default function WishlistGrid({ items, isLoading }) {
    const { toggleWishlist } = useWishlist();
    const { addToCart } = useCart();

    const handleMoveToCart = (product) => {
        window.location.href = `/products/${product.id}`;
    };

    if (isLoading) return <div className="text-center py-10 text-gray-400">Đang tải danh sách yêu thích...</div>;

    if (items.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700 border-dashed">
                <p className="text-gray-400 mb-4">Danh sách yêu thích của bạn đang trống.</p>
                <Link href="/products" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition-colors">
                    Đi mua sắm
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((product) => (
                <div key={product.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 group flex flex-col">
                    {/* Relative container for Image fill */}
                    <div className="relative aspect-w-1 aspect-h-1 h-64 w-full">
                        <Image
                            src={product.image_url || 'https://placehold.co/600x400?text=No+Image'}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <button
                            onClick={() => toggleWishlist(product.id)}
                            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                            title="Xóa"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="p-4 flex flex-col flex-grow">
                        <h3 className="font-bold text-white truncate">{product.name}</h3>
                        <p className="text-indigo-400 font-semibold mt-1">${product.price.toFixed(2)}</p>

                        <Link
                            href={`/products/${product.id}`}
                            className="mt-auto block w-full text-center bg-gray-700 hover:bg-indigo-600 text-white py-2 rounded transition-colors text-sm font-bold"
                        >
                            Xem chi tiết
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}