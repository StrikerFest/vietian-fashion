// components/home/HeroSection.js
'use client';

import { useState, useEffect } from 'react';

export default function HeroSection({ onSearch, isLoading }) {
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form Data
    const [generalPrompt, setGeneralPrompt] = useState('');
    const [attributeValues, setAttributeValues] = useState({}); // Stores inputs for dynamic fields

    // Config
    const [searchConfig, setSearchConfig] = useState([]); // ['Season', 'Occasion']

    // Load Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings?key=ai_search_attributes');
                const data = await res.json();
                if (data && data.value) {
                    setSearchConfig(data.value);
                }
            } catch (error) {
                console.error("Failed to load search settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const handleAttributeChange = (attr, value) => {
        setAttributeValues(prev => ({ ...prev, [attr]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsModalOpen(false);

        // Pass structured data to parent
        onSearch({
            generalPrompt,
            attributes: attributeValues
        });
    };

    return (
        <div className="relative bg-gray-800 overflow-hidden border-b border-gray-700">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="relative max-w-4xl mx-auto py-24 px-4 text-center">
                <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
                    Your Style, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI Curated.</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                    {`Describe the outfit you're looking for, and let our AI find the perfect match.`}
                </p>

                {/* Trigger Button */}
                <div className="max-w-xl mx-auto relative">
                    <div
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-gray-900/80 backdrop-blur border border-gray-600 text-gray-400 rounded-full py-4 pl-6 pr-32 shadow-lg cursor-text text-left hover:border-indigo-500 transition-colors"
                    >
                        {generalPrompt || "e.g., 'A breathable linen shirt for a beach wedding'"}
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-full shadow-md transition-colors"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* --- SEARCH MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in-up">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span>✨</span> AI Style Finder
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">

                            {/* General Prompt */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    Describe what you are looking for
                                </label>
                                <textarea
                                    value={generalPrompt}
                                    onChange={(e) => setGeneralPrompt(e.target.value)}
                                    placeholder="e.g. I need a complete outfit for a summer garden party. Something floral but elegant."
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32"
                                ></textarea>
                            </div>

                            {/* Dynamic Attributes */}
                            {searchConfig.length > 0 && (
                                <div className="grid grid-cols-2 gap-4">
                                    {searchConfig.map((attr) => (
                                        <div key={attr}>
                                            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                                                {attr}
                                            </label>
                                            <input
                                                type="text"
                                                value={attributeValues[attr] || ''}
                                                onChange={(e) => handleAttributeChange(attr, e.target.value)}
                                                placeholder={`Any ${attr}...`}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transform transition hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Finding Best Matches...' : 'Find My Outfit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}