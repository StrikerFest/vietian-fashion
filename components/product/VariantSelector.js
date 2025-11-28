// components/product/VariantSelector.js
'use client';

import { useMemo } from 'react';

export default function VariantSelector({ variants, selectedVariant, onSelect }) {
    // 1. Extract all available Attribute Groups from the variants dynamically
    // e.g. ["Color", "Size", "Material"]
    const availableGroups = useMemo(() => {
        if (!variants || variants.length === 0) return [];

        const groups = new Set();
        variants.forEach(v => {
            if (v.attributes) {
                Object.keys(v.attributes).forEach(key => groups.add(key));
            }
        });
        return Array.from(groups).sort();
    }, [variants]);

    // 2. Helper to get valid options for a specific group
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

        // Start with current attributes
        const currentAttributes = selectedVariant?.attributes || {};

        // Apply new selection
        const targetAttributes = { ...currentAttributes, [groupName]: value };

        // Find the best match
        const exactMatch = variants.find(v => {
            const vAttrs = v.attributes || {};
            // Check if this variant matches ALL target attributes
            return Object.entries(targetAttributes).every(([key, val]) => vAttrs[key] === val);
        });

        if (exactMatch) {
            onSelect(exactMatch);
        } else {
            // Fuzzy Match: If exact combination doesn't exist, just switch to the variant that has the clicked value
            // (Resetting other selections effectively)
            const partialMatch = variants.find(v => {
                const val = v.attributes?.[groupName];
                return val === value;
            });
            if (partialMatch) onSelect(partialMatch);
        }
    };

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
                            // Check if selected
                            const currentVal = selectedVariant?.attributes?.[groupName];
                            const isSelected = currentVal === optionValue;

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