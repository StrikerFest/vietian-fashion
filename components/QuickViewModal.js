// components/QuickViewModal.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext'; //

export default function QuickViewModal({ productId, onClose }) {
    const { addToCart } = useCart(); //
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState(null);

    // Fetch product data when the productId prop changes
    useEffect(() => {
        if (!productId) {
            // Reset state if modal is closed (productId is null)
            setProduct(null);
            setIsLoading(true);
            return;
        }

        const fetchProduct = async () => {
            setIsLoading(true);
            try {
                // Use the existing API endpoint to get product details
                const response = await fetch(`/api/products/${productId}`); ///route.js]
                if (!response.ok) throw new Error('Product not found');
                const data = await response.json();
                setProduct(data);

                // Set the default selected variant
                if (data.product_variants && data.product_variants.length > 0) {
                    setSelectedVariant(data.product_variants[0]);
                }
            } catch (error) {
                console.error("Failed to fetch product for quick view:", error);
                setProduct(null);
                onClose(); // Close modal if product fails to load
            } finally {
                setIsLoading(false);
            }
        };

        fetchProduct();
    }, [productId, onClose]); // Rerun effect if productId changes

    // Handle adding the selected variant to the cart
    const handleAddToCart = () => {
        if (product && selectedVariant) {
            addToCart(product, selectedVariant); //
            onClose(); // Close the modal after adding to cart
        }
    };

    // Calculate stock for the selected variant
    const stockOnHand = selectedVariant?.inventory_levels?.[0]?.on_hand || 0;
    const isOutOfStock = stockOnHand <= 0;

    // Don't render anything if no product ID is provided
    if (!productId) {
        return null;
    }

    return (
        // Modal Overlay
        <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={onClose} // Close modal on backdrop click
        >
            {/* Modal Content */}
            <div
                className="bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()} // Prevent content click from closing modal
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl"
                    aria-label="Close"
                >
                    &times;
                </button>

                {isLoading || !product ? (
                    // Loading State
                    <div className="p-8 text-center">Loading product...</div>
                ) : (
                    // Content Loaded
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                        {/* Image Column */}
                        <div>
                            <img
                                src={product.image_url || 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image'}
                                alt={product.name}
                                className="w-full rounded-lg shadow-lg object-cover"
                            />
                        </div>

                        {/* Details Column */}
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-extrabold mb-2">{product.name}</h1>
                            <p className="text-2xl font-semibold text-indigo-400 mb-4">
                                ${selectedVariant?.price.toFixed(2)}
                            </p>

                            {/* Short Description */}
                            <p className="text-gray-400 mb-6 text-sm">
                                {product.description?.substring(0, 150) || 'No description available.'}
                                {product.description?.length > 150 && '...'}
                            </p>

                            {/* Variant Selection */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-300 mb-2">
                                    Select Variant: <span className="text-white font-semibold">{selectedVariant?.color} / {selectedVariant?.size}</span>
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {product.product_variants.map(variant => (
                                        <button
                                            key={variant.id}
                                            onClick={() => setSelectedVariant(variant)}
                                            className={`py-2 px-4 rounded-md border text-xs font-semibold transition-colors
                                                ${selectedVariant?.id === variant.id
                                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            {variant.color} / {variant.size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions (at the bottom) */}
                            <div className="mt-auto space-y-4">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={isOutOfStock || !selectedVariant}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                    {!selectedVariant ? 'Select a Variant' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                                </button>
                                {selectedVariant && !isOutOfStock && (
                                    <p className="text-xs text-gray-400 text-center">{stockOnHand} in stock</p>
                                )}

                                <Link
                                    href={`/products/${product.id}`}
                                    className="block text-center text-indigo-400 hover:text-indigo-300 font-semibold"
                                >
                                    View Full Details
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}