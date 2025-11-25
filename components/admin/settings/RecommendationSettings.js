// components/admin/settings/RecommendationSettings.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function RecommendationSettings() {
    const { addToast } = useToast();

    // Attribute Config State
    const [availableAttributes, setAvailableAttributes] = useState([]);
    const [selectedAttributes, setSelectedAttributes] = useState([]);

    // Limits State
    const [limits, setLimits] = useState({
        products: 8,
        collections: 2,
        attributes: 2
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load Data
    useEffect(() => {
        const init = async () => {
            try {
                // 1. Fetch Attributes from DB
                const catRes = await fetch('/api/categories?type=attribute');
                const allCategories = await catRes.json();
                // Filter to only get "Root" attributes (e.g. Color, Material)
                const rootAttributes = allCategories.filter(c => !c.parent_id);
                setAvailableAttributes(rootAttributes);

                // 2. Fetch Settings
                const [attrSettingRes, limitSettingRes] = await Promise.all([
                    fetch('/api/settings?key=ai_search_attributes'),
                    fetch('/api/settings?key=ai_search_limits')
                ]);

                const attrData = await attrSettingRes.json();
                if (attrData && attrData.value) {
                    setSelectedAttributes(attrData.value);
                }

                const limitData = await limitSettingRes.json();
                if (limitData && limitData.value) {
                    setLimits({
                        products: parseInt(limitData.value.products) || 8,
                        collections: parseInt(limitData.value.collections) || 2,
                        attributes: parseInt(limitData.value.attributes) || 2
                    });
                }

            } catch (error) {
                console.error("Failed to load settings:", error);
                addToast("Failed to load configuration.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [addToast]);

    // Handlers
    const handleToggleAttribute = (name) => {
        setSelectedAttributes(prev =>
            prev.includes(name)
                ? prev.filter(item => item !== name)
                : [...prev, name]
        );
    };

    const handleLimitChange = (key, value) => {
        // Ensure it's a number and not negative
        const numValue = Math.max(0, parseInt(value) || 0);
        setLimits(prev => ({ ...prev, [key]: numValue }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save Attributes Config
            const attrReq = fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'ai_search_attributes',
                    value: selectedAttributes,
                    description: 'Attributes displayed in the AI Search Modal inputs.'
                })
            });

            // Save Limits Config
            const limitReq = fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'ai_search_limits',
                    value: limits,
                    description: 'Max items to display in AI recommendation results.'
                })
            });

            await Promise.all([attrReq, limitReq]);

            addToast("Configuration updated successfully!", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to save settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-gray-400 p-4 animate-pulse">Loading configuration...</div>;

    return (
        <div className="space-y-8">

            {/* Section 1: Attributes Selection */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
                <h3 className="text-lg font-medium text-white mb-2">AI Search Prompt Fields</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Select which specific attributes customers can define when using the AI Search {`(e.g. "Season", "Material")`}.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableAttributes.map((attr) => (
                        <label
                            key={attr.id}
                            className={`
                                flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200
                                ${selectedAttributes.includes(attr.name)
                                ? 'bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500/50'
                                : 'bg-gray-900/50 border-gray-600 hover:border-gray-500 hover:bg-gray-800'}
                            `}
                        >
                            <input
                                type="checkbox"
                                checked={selectedAttributes.includes(attr.name)}
                                onChange={() => handleToggleAttribute(attr.name)}
                                className="h-4 w-4 text-indigo-600 rounded border-gray-500 bg-gray-700 focus:ring-indigo-500 transition-colors"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-200 select-none">
                                {attr.name}
                            </span>
                        </label>
                    ))}
                </div>

                {availableAttributes.length === 0 && (
                    <div className="text-yellow-500 text-sm mt-2 bg-yellow-900/10 p-3 rounded border border-yellow-900/30">
                        No attributes found. Go to <strong>Categories</strong> and create new categories with type {`"Attribute"`}.
                    </div>
                )}
            </div>

            {/* Section 2: Display Limits */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
                <h3 className="text-lg font-medium text-white mb-2">Result Display Limits</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Control the maximum number of recommendations shown to the customer.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Product Limit */}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Max Products
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={limits.products}
                            onChange={(e) => handleLimitChange('products', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-2">Recommended: 4-12</p>
                    </div>

                    {/* Collection Limit */}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Max Collections
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={limits.collections}
                            onChange={(e) => handleLimitChange('collections', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-2">Recommended: 1-2</p>
                    </div>

                    {/* Attribute Limit */}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Max Categories
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={limits.attributes}
                            onChange={(e) => handleLimitChange('attributes', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-2">Recommended: 1-2</p>
                    </div>
                </div>
            </div>

            {/* Save Action */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isSaving ? 'Saving Configuration...' : 'Save All Settings'}
                </button>
            </div>
        </div>
    );
}