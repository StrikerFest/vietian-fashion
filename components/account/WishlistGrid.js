// components/account/WishlistGrid.js
'use client';

import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

export default function WishlistGrid({ items, isLoading }) {
    const { toggleWishlist } = useWishlist();
    const { addToCart } = useCart();

    const handleMoveToCart = (product) => {
        // We don't have a variant selected here, so we'd redirect to the product page
        // OR verify if there's only 1 variant. For safety, let's redirect.
        window.location.href = `/products/${product.id}`;
    };

    if (isLoading) return <div className="text-center py-10 text-gray-400">Loading wishlist...</div>;

    if (items.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700 border-dashed">
                <p className="text-gray-400 mb-4">Your wishlist is empty.</p>
                <Link href="/products" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition-colors">
                    Go Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((product) => (
                <div key={product.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 group">
                    <div className="relative aspect-w-1 aspect-h-1">
                        <img
                            src={product.image_url || 'https://placehold.co/600x400?text=No+Image'}
                            alt={product.name}
                            className="w-full h-64 object-cover"
                        />
                        <button
                            onClick={() => toggleWishlist(product.id)}
                            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors"
                            title="Remove"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="p-4">
                        <h3 className="font-bold text-white truncate">{product.name}</h3>
                        <p className="text-indigo-400 font-semibold mt-1">${product.price.toFixed(2)}</p>

                        <Link
                            href={`/products/${product.id}`}
                            className="mt-4 block w-full text-center bg-gray-700 hover:bg-indigo-600 text-white py-2 rounded transition-colors text-sm font-bold"
                        >
                            View Options
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}