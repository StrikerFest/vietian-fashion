// components/home/HeroSection.js
'use client';

import { useState } from 'react';

export default function HeroSection({ onSearch, isLoading }) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
    };

    return (
        <div className="relative bg-gray-800 overflow-hidden border-b border-gray-700">
            {/* Background Glow Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="relative max-w-4xl mx-auto py-24 px-4 text-center">
                <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
                    Your Style, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI Curated.</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                    Describe the outfit you're looking for, and let our AI analyze your request to find the perfect match from our collection.
                </p>

                <form onSubmit={handleSubmit} className="max-w-xl mx-auto relative">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., 'A breathable linen shirt for a beach wedding'"
                            className="w-full bg-gray-900/80 backdrop-blur border border-gray-600 text-white rounded-full py-4 pl-6 pr-32 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !query.trim()}
                            className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-full transition-all disabled:bg-gray-700 disabled:cursor-not-allowed shadow-md"
                        >
                            {isLoading ? 'Finding...' : 'Search'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        Powered by Google Gemini • Semantic Search
                    </p>
                </form>
            </div>
        </div>
    );
}