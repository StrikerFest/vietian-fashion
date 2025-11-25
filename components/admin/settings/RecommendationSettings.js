'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function RecommendationSettings() {
    const { addToast } = useToast();

    // State
    const [availableAttributes, setAvailableAttributes] = useState([]);
    const [selectedAttributes, setSelectedAttributes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 1. Fetch Data on Mount
    useEffect(() => {
        const init = async () => {
            try {
                // A. Fetch all available Attributes from Categories table
                const catRes = await fetch('/api/categories?type=attribute');
                const allCategories = await catRes.json();

                // Filter to only get "Root" attributes (e.g. Color, Material, Season)
                const rootAttributes = allCategories.filter(c => !c.parent_id);
                setAvailableAttributes(rootAttributes);

                // B. Fetch currently saved configuration
                const settingRes = await fetch('/api/settings?key=ai_search_attributes');
                const settingData = await settingRes.json();

                if (settingData && settingData.value) {
                    setSelectedAttributes(settingData.value);
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

    // 2. Handlers
    const handleToggle = (name) => {
        setSelectedAttributes(prev =>
            prev.includes(name)
                ? prev.filter(item => item !== name)
                : [...prev, name]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'ai_search_attributes',
                    value: selectedAttributes,
                    description: 'Attributes displayed in the AI Search Modal inputs.'
                })
            });

            if (!response.ok) throw new Error('Failed to save');
            addToast("Search configuration updated!", "success");
        } catch (error) {
            addToast(error.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-gray-400 p-4">Loading configuration...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-2">AI Search Prompt Fields</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Select which specific attributes customers can define when using the AI Search.
                    These options are fetched directly from your <strong>Attribute Categories</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableAttributes.map((attr) => (
                        <label
                            key={attr.id}
                            className={`
                                flex items-center p-3 rounded border cursor-pointer transition-colors
                                ${selectedAttributes.includes(attr.name)
                                ? 'bg-indigo-900/30 border-indigo-500'
                                : 'bg-gray-800 border-gray-600 hover:border-gray-500'}
                            `}
                        >
                            <input
                                type="checkbox"
                                checked={selectedAttributes.includes(attr.name)}
                                onChange={() => handleToggle(attr.name)}
                                className="h-4 w-4 text-indigo-600 rounded border-gray-500 bg-gray-700 focus:ring-indigo-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-200">
                                {attr.name}
                            </span>
                        </label>
                    ))}
                </div>

                {availableAttributes.length === 0 && (
                    <div className="text-yellow-500 text-sm mt-2">
                        No attributes found. Go to <strong>Categories</strong> and create new categories with type "Attribute".
                    </div>
                )}
            </div>

            <div className="flex justify-end border-t border-gray-700 pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
}