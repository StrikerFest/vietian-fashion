// app/products/page.js
'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
// --- NEW: Import Modal ---
import QuickViewModal from '@/components/QuickViewModal';

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- NEW: State for Modal ---
    const [quickViewProductId, setQuickViewProductId] = useState(null);

    const handleOpenQuickView = (productId) => {
        setQuickViewProductId(productId);
    };

    const handleCloseQuickView = () => {
        setQuickViewProductId(null);
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/products');
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error("Failed to fetch products:", error);
            }
            setIsLoading(false);
        };

        fetchProducts();
    }, []);

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-extrabold text-center mb-12">Our Collection</h1>

                {isLoading ? (
                    <p className="text-center">Loading our collection...</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {products.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                // --- NEW: Pass the handler ---
                                onQuickViewClick={handleOpenQuickView}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* --- NEW: Render the Modal --- */}
            <QuickViewModal
                productId={quickViewProductId}
                onClose={handleCloseQuickView}
            />
        </main>
    );
}