// app/page.js
'use client';

// --- NEW: Import useState and QuickViewModal ---
import { useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
// --- NEW ---
import QuickViewModal from '@/components/QuickViewModal';

export default function HomePage() {
    // @unchanged (searchQuery, searchResults, etc. states)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // --- NEW: State and handlers for the modal ---
    const [quickViewProductId, setQuickViewProductId] = useState(null);

    const handleOpenQuickView = (productId) => {
        setQuickViewProductId(productId);
    };

    const handleCloseQuickView = () => {
        setQuickViewProductId(null);
    };

    // @unchanged (handleSearch function)
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        setHasSearched(true);
        setSearchResults([]);

        try {
            const response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery }),
            });

            if (!response.ok) {
                throw new Error('Failed to get recommendations');
            }

            const data = await response.json();
            setSearchResults(data.products || []);
        } catch (error) {
            console.error("Search failed:", error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-900 text-white">
            {/* @unchanged (Hero Section with Search Form) */}
            <div className="text-center py-20 px-4">
                <h1 className="text-5xl font-extrabold mb-4">AI-Powered Fashion</h1>
                <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
                    Describe your style, and let our AI find the perfect outfit for you.
                </p>

                <form onSubmit={handleSearch} className="max-w-xl mx-auto">
                    <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg p-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="e.g., 'a casual t-shirt for summer' or 'formal black pants'"
                            className="w-full bg-transparent text-white placeholder-gray-500 p-2 border-none focus:ring-0"
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isLoading ? '...' : 'Find'}
                        </button>
                    </div>
                </form>
            </div>

            {/* --- MODIFIED: Dynamic Search Results Section --- */}
            <div className="py-12 px-4">
                {hasSearched && (
                    <>
                        {/* @unchanged (h2, loading/empty messages) */}
                        <h2 className="text-3xl font-bold text-center mb-8">
                            {isLoading ? 'Searching for your style...' : 'Our Recommendations For You'}
                        </h2>
                        <div className="max-w-7xl mx-auto">
                            {isLoading ? (
                                <p className="text-center text-gray-400">Please wait while our AI finds the best matches...</p>
                            ) : searchResults.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                    {searchResults.map(product => (
                                        // --- FIX: Pass the onQuickViewClick prop ---
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onQuickViewClick={handleOpenQuickView}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-400">
                                    Sorry, we could not find any matches for that. Try describing it a different way!
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* --- NEW: Render the modal (it's hidden by default) --- */}
            <QuickViewModal
                productId={quickViewProductId}
                onClose={handleCloseQuickView}
            />
        </main>
    );
}