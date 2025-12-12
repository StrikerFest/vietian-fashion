// components/QuickViewModal.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';

export default function QuickViewModal({ productId, onClose }) {
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState(null);

    useEffect(() => {
        if (!productId) {
            setProduct(null);
            setIsLoading(true);
            return;
        }

        const fetchProduct = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/products/${productId}`);
                if (!response.ok) throw new Error('Product not found');
                const data = await response.json();
                setProduct(data);

                if (data.product_variants && data.product_variants.length > 0) {
                    setSelectedVariant(data.product_variants[0]);
                }
            } catch (error) {
                console.error("Failed to fetch product for quick view:", error);
                setProduct(null);
                onClose();
            } finally {
                setIsLoading(false);
            }
        };

        fetchProduct();
    }, [productId, onClose]);

    const handleAddToCart = () => {
        if (product && selectedVariant) {
            addToCart(product, selectedVariant);
            onClose();
        }
    };

    const stockOnHand = selectedVariant?.inventory_levels?.[0]?.on_hand || 0;
    const isOutOfStock = stockOnHand <= 0;

    // --- NEW: Helper to generate a display name for the variant ---
    const getVariantLabel = (variant) => {
        if (!variant) return '';
        // If we have dynamic attributes mapped, use them
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            return Object.values(variant.attributes).join(' / ');
        }
        // Fallback SKU
        return variant.sku;
    };

    if (!productId) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl z-10"
                    aria-label="Close"
                >
                    &times;
                </button>

                {isLoading || !product ? (
                    <div className="p-8 text-center">Đang tải sản phẩm...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                        {/* Image Column */}
                        <div className="relative h-64 md:h-auto w-full">
                            <Image
                                src={product.image_url || 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image'}
                                alt={product.name}
                                fill
                                className="rounded-lg shadow-lg object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        </div>

                        {/* Details Column */}
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-extrabold mb-2">{product.name}</h1>
                            <p className="text-2xl font-semibold text-indigo-400 mb-4">
                                ${selectedVariant?.price.toFixed(2)}
                            </p>

                            <p className="text-gray-400 mb-6 text-sm">
                                {product.description?.substring(0, 150) || 'Chưa có mô tả.'}
                                {product.description?.length > 150 && '...'}
                            </p>

                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-300 mb-2">
                                    Chọn biến thể: <span className="text-white font-semibold">{getVariantLabel(selectedVariant)}</span>
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
                                            {getVariantLabel(variant)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-auto space-y-4">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={isOutOfStock || !selectedVariant}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                    {!selectedVariant ? 'Chọn một biến thể' : isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
                                </button>
                                {selectedVariant && !isOutOfStock && (
                                    <p className="text-xs text-gray-400 text-center">{stockOnHand} trong kho</p>
                                )}

                                <Link
                                    href={`/products/${product.id}`}
                                    className="block text-center text-indigo-400 hover:text-indigo-300 font-semibold"
                                >
                                    Xem chi tiết đầy đủ
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}