// components/home/HeroSection.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // --- NEW ---

export default function HeroSection() { // Removed props since it handles its own nav
    const router = useRouter(); // --- NEW ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generalPrompt, setGeneralPrompt] = useState('');
    const [attributeValues, setAttributeValues] = useState({});
    const [searchConfig, setSearchConfig] = useState([]);

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

        // --- NEW: Redirect Logic ---
        // We encode the complex object into a single query string or minimal params
        // For simplicity, we'll put the text in 'q' and attributes in 'attrs' (JSON string)
        const params = new URLSearchParams();
        if (generalPrompt) params.set('q', generalPrompt);

        // Filter empty attributes
        const validAttributes = Object.fromEntries(
            Object.entries(attributeValues).filter(([_, v]) => v.trim() !== '')
        );

        if (Object.keys(validAttributes).length > 0) {
            params.set('attrs', JSON.stringify(validAttributes));
        }

        if (params.toString()) {
            router.push(`/search?${params.toString()}`);
        }
    };

    return (
        <div className="relative bg-gray-800 border-b border-gray-700">
            {/* Condensed Padding since we have a carousel above now */}
            <div className="relative max-w-4xl mx-auto py-12 px-4 text-center">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                    What are you looking for?
                </h1>

                {/* Trigger Button */}
                <div className="max-w-xl mx-auto relative">
                    <div
                        onClick={() => setIsModalOpen(true)}
                        className="w-full bg-gray-900 border border-gray-600 text-gray-400 rounded-full py-3 pl-6 pr-32 shadow-inner cursor-text text-left hover:border-indigo-500 transition-colors"
                    >
                        {generalPrompt || "Describe your ideal outfit..."}
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-full transition-colors"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* --- SEARCH MODAL (Unchanged structure, just submits differently) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span>✨</span> AI Style Finder
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Describe it</label>
                                <textarea
                                    value={generalPrompt}
                                    onChange={(e) => setGeneralPrompt(e.target.value)}
                                    placeholder="e.g. A summer outfit for a beach wedding..."
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                                ></textarea>
                            </div>
                            {searchConfig.length > 0 && (
                                <div className="grid grid-cols-2 gap-4">
                                    {searchConfig.map((attr) => (
                                        <div key={attr}>
                                            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">{attr}</label>
                                            <input
                                                type="text"
                                                value={attributeValues[attr] || ''}
                                                onChange={(e) => handleAttributeChange(attr, e.target.value)}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="pt-2">
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg">
                                    Find Matches
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}