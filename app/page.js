// app/page.js
'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard'; // We'll need this

export default function HomePage() {
    // --- NEW STATES for the search feature ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false); // To know when to show results/messages

    // Function to handle the form submission
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return; // Don't search if the query is empty

        setIsLoading(true);
        setHasSearched(true);
        setSearchResults([]); // Clear old results

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
            // In case of an error, we'll just show the "no results" message
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-900 text-white">
            {/* Hero Section with NEW Search Form */}
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

            {/* --- NEW Dynamic Search Results Section --- */}
            <div className="py-12 px-4">
                {hasSearched && (
                    <>
                        <h2 className="text-3xl font-bold text-center mb-8">
                            {isLoading ? 'Searching for your style...' : 'Our Recommendations For You'}
                        </h2>
                        <div className="max-w-7xl mx-auto">
                            {isLoading ? (
                                <p className="text-center text-gray-400">Please wait while our AI finds the best matches...</p>
                            ) : searchResults.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                    {searchResults.map(product => (
                                        <ProductCard key={product.id} product={product} />
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
        </main>
    );
}