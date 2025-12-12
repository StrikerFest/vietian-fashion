// components/home/HeroSection.js
'use client';

import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';

export default function HeroSection() {
    const router = useRouter();

    // Search Modes: 'keyword' (Traditional) vs 'semantic' (AI)
    const [searchMode, setSearchMode] = useState('keyword');

    // State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generalPrompt, setGeneralPrompt] = useState('');
    const [attributeValues, setAttributeValues] = useState({});
    const [searchConfig, setSearchConfig] = useState([]);

    // Load AI Config
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings?key=ai_search_attributes');
                const data = await res.json();
                if (data && data.value) setSearchConfig(data.value);
            } catch (error) {
                console.error("Failed to load search settings:", error);
            }
        };
        fetchSettings();
    }, []);

    // --- Handlers ---
    const handleAttributeChange = (attr, value) => {
        setAttributeValues(prev => ({...prev, [attr]: value}));
    };

    const performSearch = (query, attributes = {}) => {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        params.set('mode', searchMode); // <--- Pass the mode

        // Only attach attributes if in semantic mode and they exist
        if (searchMode === 'semantic') {
            const validAttributes = Object.fromEntries(
                Object.entries(attributes).filter(([_, v]) => v.trim() !== '')
            );
            if (Object.keys(validAttributes).length > 0) {
                params.set('attrs', JSON.stringify(validAttributes));
            }
        }

        if (params.toString()) {
            router.push(`/search?${params.toString()}`);
        }
        setIsModalOpen(false);
    };

    const handleModalSubmit = (e) => {
        e.preventDefault();
        performSearch(generalPrompt, attributeValues);
    };

    const handleKeywordSubmit = (e) => {
        e.preventDefault();
        performSearch(generalPrompt);
    };

    return (
        <div className="relative bg-gray-800 border-b border-gray-700">
            <div className="relative max-w-4xl mx-auto py-12 px-4 text-center">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
                    Tìm Kiếm Phong Cách Hoàn Hảo Của Bạn
                </h1>

                {/* --- Mode Toggle Pill --- */}
                <div className="flex justify-center mb-6">
                    <div className="bg-gray-900 p-1 rounded-full border border-gray-700 inline-flex relative">
                        {/* Background slider for active state */}
                        <div
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-indigo-600 rounded-full transition-all duration-300 ${
                                searchMode === 'keyword' ? 'left-1' : 'left-[50%]'
                            }`}
                        ></div>

                        <button
                            onClick={() => {
                                setSearchMode('keyword');
                                setGeneralPrompt('');
                            }}
                            className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors w-40 ${
                                searchMode === 'keyword' ? 'text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Từ khóa
                        </button>
                        <button
                            onClick={() => {
                                setSearchMode('semantic');
                                setGeneralPrompt('');
                            }}
                            className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors w-40 ${
                                searchMode === 'semantic' ? 'text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Trợ lý AI
                        </button>
                    </div>
                </div>

                {/* --- Search Input Area --- */}
                <div className="max-w-xl mx-auto relative">
                    {searchMode === 'keyword' ? (
                        // Keyword Mode: Real Input
                        <form onSubmit={handleKeywordSubmit}>
                            <input
                                type="text"
                                value={generalPrompt}
                                onChange={(e) => setGeneralPrompt(e.target.value)}
                                placeholder="Tìm theo tên (ví dụ: 'Váy mùa hè')..."
                                className="w-full bg-gray-900 border border-gray-600 text-white rounded-full py-3 pl-6 pr-32 shadow-inner focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <button
                                type="submit"
                                className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-full transition-colors"
                            >
                                Tìm kiếm
                            </button>
                        </form>
                    ) : (
                        // Semantic Mode: Fake Input triggers Modal
                        <div className="relative">
                            <div
                                onClick={() => setIsModalOpen(true)}
                                className="w-full bg-gray-900 border border-indigo-500/50 text-gray-300 rounded-full py-3 pl-6 pr-32 shadow-inner cursor-pointer text-left hover:border-indigo-400 transition-colors flex items-center gap-2"
                            >
                                <span className="text-indigo-400">✨</span>
                                {generalPrompt || "Mô tả trang phục lý tưởng của bạn..."}
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-full transition-colors"
                            >
                                Mô tả
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- AI SEARCH MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span>✨</span> Tìm Kiếm Phong Cách AI
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleModalSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    Mô tả những gì bạn đang tìm kiếm
                                </label>
                                <textarea
                                    value={generalPrompt}
                                    onChange={(e) => setGeneralPrompt(e.target.value)}
                                    placeholder="Ví dụ: Tôi cần một bộ trang phục sang trọng cho đám cưới bãi biển, ưu tiên chất liệu thoáng mát..."
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
                                    Tìm kết quả phù hợp
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}