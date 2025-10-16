// app/products/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function ProductDetailPage(props) {
    const { id } = props.params;
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState(null);

    useEffect(() => {
        const initializeProduct = async () => {
            setIsLoading(true);
            try {
                if (!id) throw new Error("No ID provided");

                const response = await fetch(`/api/products/${id}`);
                if (!response.ok) throw new Error('Product not found');
                const data = await response.json();
                setProduct(data);

                if (data.product_variants && data.product_variants.length > 0) {
                    setSelectedVariant(data.product_variants[0]);
                }
            } catch (error) {
                console.error("Failed to fetch product:", error);
                setProduct(null);
            } finally {
                setIsLoading(false);
            }
        };

        initializeProduct();
    }, [id]);

    const handleAddToCart = () => {
        if (product && selectedVariant) {
            addToCart(product, selectedVariant);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading product...</div>;
    }

    if (!product) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Product not found. <Link href="/products" className="ml-2 text-indigo-400">Go back</Link></div>;
    }

    const imageUrl = product.image_url || 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image';

    // --- NEW INVENTORY LOGIC ---
    // Calculate available stock for the selected variant
    const stockOnHand = selectedVariant?.inventory_levels?.on_hand || 0;
    const isOutOfStock = stockOnHand <= 0;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <img src={imageUrl} alt={product.name} className="w-full rounded-lg shadow-lg" />
                </div>
                <div>
                    <h1 className="text-4xl font-extrabold mb-2">{product.name}</h1>
                    <p className="text-2xl font-semibold text-indigo-400 mb-4">${selectedVariant?.price.toFixed(2)}</p>
                    <p className="text-gray-400 mb-6">{product.description}</p>

                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-300 mb-2">Select Variant:</h3>
                        <div className="flex flex-wrap gap-2">
                            {product.product_variants.map(variant => (
                                <button
                                    key={variant.id}
                                    onClick={() => setSelectedVariant(variant)}
                                    className={`py-2 px-4 rounded-md border text-sm font-semibold transition-colors
                                        ${selectedVariant?.id === variant.id
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                                        }`}
                                >
                                    {variant.color} / {variant.size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* --- UPDATED BUTTON with stock check --- */}
                    <button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    { !isOutOfStock && <p className="text-xs text-gray-400 mt-2 text-center">{stockOnHand} in stock</p> }
                </div>
            </div>
        </main>
    );
}