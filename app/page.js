// app/page.js
'use client';

import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import HeroSection from '@/components/home/HeroSection';

export default function HomePage() {
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [quickViewProductId, setQuickViewProductId] = useState(null);

    const handleSearch = async (query) => {
        if (!query.trim()) return;
        setIsLoading(true);
        setHasSearched(true);
        setSearchResults([]);

        try {
            const response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            setSearchResults(data.products || []);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-900 text-white">
            <HeroSection onSearch={handleSearch} isLoading={isLoading} />

            <div className="py-16 px-4">
                {hasSearched && (
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                            {isLoading ? 'Searching...' : (
                                <>
                                    <span>Recommended for You</span>
                                    <span className="text-sm font-normal text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
                                        {searchResults.length} results
                                    </span>
                                </>
                            )}
                        </h2>

                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 animate-pulse">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-gray-800 h-80 rounded-lg"></div>
                                ))}
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                {searchResults.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onQuickViewClick={setQuickViewProductId}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-800">
                                <p className="text-gray-400 text-lg">No matches found.</p>
                                <p className="text-gray-500 text-sm mt-2">{`Try using broader terms like "blue shirt" or "summer dress".`}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <QuickViewModal
                productId={quickViewProductId}
                onClose={() => setQuickViewProductId(null)}
            />
        </main>
    );
}