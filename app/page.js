// app/page.js
'use client';

import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import HeroSection from '@/components/home/HeroSection';
import Link from 'next/link'; // Import Link

export default function HomePage() {
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [quickViewProductId, setQuickViewProductId] = useState(null);

    // --- NEW: State for semantic matches ---
    const [matchedCollection, setMatchedCollection] = useState(null);
    const [matchedAttribute, setMatchedAttribute] = useState(null);

    const handleSearch = async (queryPayload) => {
        const isValid = typeof queryPayload === 'string'
            ? queryPayload.trim().length > 0
            : (queryPayload.generalPrompt || Object.keys(queryPayload.attributes || {}).length > 0);

        if (!isValid) return;

        setIsLoading(true);
        setHasSearched(true);
        setSearchResults([]);
        // Reset matches
        setMatchedCollection(null);
        setMatchedAttribute(null);

        try {
            const response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(typeof queryPayload === 'string' ? { query: queryPayload } : queryPayload),
            });

            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();

            setSearchResults(data.products || []);
            // Set new matches
            setMatchedCollection(data.collection || null);
            setMatchedAttribute(data.attribute || null);

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

                        {/* --- NEW: Semantic Recommendation Cards --- */}
                        {!isLoading && (matchedCollection || matchedAttribute) && (
                            <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                {matchedCollection && (
                                    <div className="bg-gradient-to-br from-gray-800 to-indigo-900/40 border border-indigo-500/30 p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
                                        <div>
                                            <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <span>★</span> Collection Match
                                            </p>
                                            <h3 className="text-2xl font-bold text-white">{matchedCollection.name}</h3>
                                            {matchedCollection.description && (
                                                <p className="text-gray-400 text-sm mt-1 line-clamp-2">{matchedCollection.description}</p>
                                            )}
                                        </div>
                                        <Link
                                            href={`/collections/${matchedCollection.slug}`}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors text-sm whitespace-nowrap shadow-md"
                                        >
                                            View Collection &rarr;
                                        </Link>
                                    </div>
                                )}

                                {matchedAttribute && (
                                    <div className="bg-gradient-to-br from-gray-800 to-purple-900/40 border border-purple-500/30 p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
                                        <div>
                                            <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <span>✦</span> Category Match
                                            </p>
                                            <h3 className="text-2xl font-bold text-white">{matchedAttribute.name}</h3>
                                            <p className="text-gray-400 text-sm mt-1">Browse all {matchedAttribute.name} items</p>
                                        </div>
                                        <Link
                                            href={`/categories/${matchedAttribute.slug}`}
                                            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors text-sm whitespace-nowrap shadow-md"
                                        >
                                            Explore &rarr;
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}

                        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                            {isLoading ? 'Searching...' : (
                                <>
                                    <span>Recommended Products</span>
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
                                <p className="text-gray-400 text-lg">No individual products matched perfectly.</p>
                                {(matchedCollection || matchedAttribute) ? (
                                    <p className="text-gray-500 text-sm mt-2">But we found some matching categories above!</p>
                                ) : (
                                    <p className="text-gray-500 text-sm mt-2">{`Try using different terms or broader categories.`}</p>
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