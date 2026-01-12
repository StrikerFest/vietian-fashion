'use client';

import { useState, useEffect } from 'react';

export default function ProductDetails({ product }) {
    const [sizeGuides, setSizeGuides] = useState([]);
    const [careGuides, setCareGuides] = useState([]);
    const [activeTab, setActiveTab] = useState('size'); // 'size' | 'care'
    const [matchedSizeGuide, setMatchedSizeGuide] = useState(null);
    const [matchedCareGuides, setMatchedCareGuides] = useState([]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings?key=guide_settings');
                const data = await res.json();

                if (data && data.value) {
                    setSizeGuides(data.value.size_guides || []);
                    setCareGuides(data.value.care_guides || []);
                }
            } catch (error) {
                console.error("Failed to load guides:", error);
            }
        };
        fetchSettings();
    }, []);

    // --- MATCHING LOGIC ---
    useEffect(() => {
        if (!product) return;

        // 1. Match Size Guide (Priority: First match found)
        const matchedSize = sizeGuides.find(guide => 
            product.catalog_categories?.some(c => guide.categories.includes(c.slug))
        );
        setMatchedSizeGuide(matchedSize);

        // 2. Match Care Instructions (Collect ALL matches)
        const matchedCare = careGuides.filter(guide => 
            product.attributes?.some(a => guide.attributes.includes(a.slug))
        );
        setMatchedCareGuides(matchedCare);

        // Auto-switch tabs if one is missing
        if (!matchedSize && matchedCare.length > 0) setActiveTab('care');

    }, [product, sizeGuides, careGuides]);

    if (!matchedSizeGuide && matchedCareGuides.length === 0) return null;

    return (
        <div className="mt-16 pt-10 border-t border-gray-700">
            <h2 className="text-2xl font-bold mb-8 text-white">Chi tiết sản phẩm</h2>

            <div className="flex gap-6 mb-6 border-b border-gray-700">
                {matchedSizeGuide && (
                    <button 
                        onClick={() => setActiveTab('size')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                            activeTab === 'size' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        Bảng quy đổi kích cỡ
                    </button>
                )}
                {matchedCareGuides.length > 0 && (
                    <button 
                        onClick={() => setActiveTab('care')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                            activeTab === 'care' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        Hướng dẫn bảo quản
                    </button>
                )}
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                
                {/* SIZE GUIDE CONTENT */}
                {activeTab === 'size' && matchedSizeGuide && (
                    <div className="animate-fade-in">
                        <p className="text-sm text-gray-400 mb-4">
                            Áp dụng cho: <span className="font-semibold text-white">{matchedSizeGuide.name}</span>
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                                    <tr>
                                        {matchedSizeGuide.columns.map((col, idx) => (
                                            <th key={idx} className="px-6 py-3">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matchedSizeGuide.rows.map((row, rIdx) => (
                                        <tr key={rIdx} className="border-b border-gray-700 hover:bg-gray-700/30">
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className={`px-6 py-4 ${cIdx === 0 ? 'font-bold text-white' : ''}`}>
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* CARE INSTRUCTIONS CONTENT */}
                {activeTab === 'care' && matchedCareGuides.length > 0 && (
                    <div className="animate-fade-in space-y-6">
                        {matchedCareGuides.map((guide, idx) => (
                            <div key={idx}>
                                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                    {guide.name}
                                </h4>
                                <p className="text-gray-400 leading-relaxed bg-gray-900/50 p-4 rounded-md border border-gray-700 whitespace-pre-wrap">
                                    {guide.content}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}