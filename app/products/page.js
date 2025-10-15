// app/products/page.js
'use client'; // This is a Client Component

import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard'; // Import our new component

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                // Fetch from the same API endpoint we used for the admin page
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
                        {/* We map over the fetched products and render a card for each one */}
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}