// app/page.js
'use client';

import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import HeroSection from '@/components/home/HeroSection';
import Link from 'next/link';

export default function HomePage() {
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [quickViewProductId, setQuickViewProductId] = useState(null);

    // --- NEW: Arrays for matches ---
    const [matchedCollections, setMatchedCollections] = useState([]);
    const [matchedAttributes, setMatchedAttributes] = useState([]);

    const handleSearch = async (queryPayload) => {
        const isValid = typeof queryPayload === 'string'
            ? queryPayload.trim().length > 0
            : (queryPayload.generalPrompt || Object.keys(queryPayload.attributes || {}).length > 0);

        if (!isValid) return;

        setIsLoading(true);
        setHasSearched(true);
        setSearchResults([]);
        setMatchedCollections([]);
        setMatchedAttributes([]);

        try {
            const response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(typeof queryPayload === 'string' ? { query: queryPayload } : queryPayload),
            });

            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();

            setSearchResults(data.products || []);
            setMatchedCollections(data.collections || []);
            setMatchedAttributes(data.attributes || []);

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

                        {/* --- Semantic Recommendations Grid --- */}
                        {!isLoading && (matchedCollections.length > 0 || matchedAttributes.length > 0) && (
                            <div className="mb-16">
                                <h3 className="text-lg font-semibold text-gray-400 mb-4 uppercase tracking-wider">Smart Recommendations</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">

                                    {/* Render Collections */}
                                    {matchedCollections.map(col => (
                                        <div key={col.id} className="bg-gradient-to-br from-gray-800 to-indigo-900/30 border border-indigo-500/20 p-6 rounded-xl flex flex-col justify-between shadow-lg hover:border-indigo-500/50 transition-colors">
                                            <div>
                                                <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <span>★</span> Collection
                                                </p>
                                                <h3 className="text-xl font-bold text-white mb-2">{col.name}</h3>
                                                {col.description && (
                                                    <p className="text-gray-400 text-sm line-clamp-2 mb-4">{col.description}</p>
                                                )}
                                            </div>
                                            <Link
                                                href={`/collections/${col.slug}`}
                                                className="text-indigo-300 text-sm font-bold hover:text-indigo-200 flex items-center gap-1"
                                            >
                                                View Collection &rarr;
                                            </Link>
                                        </div>
                                    ))}

                                    {/* Render Attributes */}
                                    {matchedAttributes.map(attr => (
                                        <div key={attr.id} className="bg-gradient-to-br from-gray-800 to-purple-900/30 border border-purple-500/20 p-6 rounded-xl flex flex-col justify-between shadow-lg hover:border-purple-500/50 transition-colors">
                                            <div>
                                                <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <span>✦</span> Category
                                                </p>
                                                <h3 className="text-xl font-bold text-white mb-2">{attr.name}</h3>
                                                <p className="text-gray-400 text-sm mb-4">Browse matching {attr.name.toLowerCase()} items.</p>
                                            </div>
                                            <Link
                                                href={`/categories/${attr.slug}`}
                                                className="text-purple-300 text-sm font-bold hover:text-purple-200 flex items-center gap-1"
                                            >
                                                Explore Category &rarr;
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- Product Grid --- */}
                        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                            {isLoading ? 'Searching...' : (
                                <>
                                    <span>Top Picks</span>
                                    <span className="text-sm font-normal text-gray-500 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                                        {searchResults.length} results
                                    </span>
                                </>
                            )}
                        </h2>

                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 animate-pulse">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-gray-800 h-96 rounded-lg"></div>
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
                            <div className="text-center py-20 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed">
                                <p className="text-gray-400 text-lg font-medium">No specific products found.</p>
                                {(matchedCollections.length > 0 || matchedAttributes.length > 0) ? (
                                    <p className="text-gray-500 text-sm mt-2">Try exploring the recommended collections above!</p>
                                ) : (
                                    <p className="text-gray-500 text-sm mt-2">{`Try adjusting your search terms (e.g., "Summer dress").`}</p>
                                )}
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