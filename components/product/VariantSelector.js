// components/product/VariantSelector.js
'use client';

import { useMemo } from 'react';

export default function VariantSelector({ variants, selectedVariant, onSelect }) {
    // 1. Extract all available Attribute Groups (Keys) from the variants
    // MOVED: Hook is now unconditional at the top level
    const availableGroups = useMemo(() => {
        if (!variants || variants.length === 0) return [];

        const groups = new Set();
        variants.forEach(v => {
            if (v.attributes) {
                Object.keys(v.attributes).forEach(key => groups.add(key));
            }
        });
        return Array.from(groups).sort(); // Sort alphabetically or define custom order
    }, [variants]);

    // 2. Helper to determine if an option is available
    const getOptionsForGroup = (groupName) => {
        if (!variants) return [];
        const options = new Set();
        variants.forEach(v => {
            if (v.attributes && v.attributes[groupName]) {
                options.add(v.attributes[groupName]);
            }
        });
        return Array.from(options).sort();
    };

    // 3. Handle Selection
    const handleOptionClick = (groupName, value) => {
        if (!variants) return;

        const currentAttributes = selectedVariant?.attributes || {};
        const newAttributes = { ...currentAttributes, [groupName]: value };

        // Find exact match
        const exactMatch = variants.find(v => {
            return Object.entries(newAttributes).every(([key, val]) => v.attributes[key] === val);
        });

        if (exactMatch) {
            onSelect(exactMatch);
        } else {
            // Fuzzy Match
            const partialMatch = variants.find(v => v.attributes[groupName] === value);
            if (partialMatch) onSelect(partialMatch);
        }
    };

    // MOVED: Early return is now AFTER all hooks are declared
    if (!variants || variants.length === 0) return null;

    return (
        <div className="mb-8 space-y-6">
            {availableGroups.map(groupName => (
                <div key={groupName}>
                    <h3 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide">
                        {groupName}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {getOptionsForGroup(groupName).map(optionValue => {
                            const isSelected = selectedVariant?.attributes?.[groupName] === optionValue;

                            return (
                                <button
                                    key={optionValue}
                                    onClick={() => handleOptionClick(groupName, optionValue)}
                                    className={`
                                        relative py-2 px-4 rounded-md border text-sm font-semibold transition-all duration-200
                                        ${isSelected
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                                    }
                                    `}
                                >
                                    {optionValue}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}