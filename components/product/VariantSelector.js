// components/product/VariantSelector.js
'use client';

import { useMemo } from 'react';

export default function VariantSelector({ variants, selectedVariant, onSelect }) {
    if (!variants || variants.length === 0) return null;

    // 1. Extract all available Attribute Groups (Keys) from the variants
    // e.g. ["Color", "Size", "Material"]
    const availableGroups = useMemo(() => {
        const groups = new Set();
        variants.forEach(v => {
            if (v.attributes) {
                Object.keys(v.attributes).forEach(key => groups.add(key));
            }
        });
        return Array.from(groups).sort(); // Sort alphabetically or define custom order
    }, [variants]);

    // 2. Helper to determine if an option is available based on current selections
    // (Simple version: Just check if the option exists in any variant)
    // A complex version would disable "Small" if "Blue" is selected but "Blue Small" is out of stock.
    const getOptionsForGroup = (groupName) => {
        const options = new Set();
        variants.forEach(v => {
            if (v.attributes && v.attributes[groupName]) {
                options.add(v.attributes[groupName]);
            }
        });
        return Array.from(options).sort();
    };

    // 3. Handle Selection
    // When a user clicks a button, we try to find the best matching variant
    const handleOptionClick = (groupName, value) => {
        // Current selected attributes
        const currentAttributes = selectedVariant?.attributes || {};
        const newAttributes = { ...currentAttributes, [groupName]: value };

        // Find exact match
        const exactMatch = variants.find(v => {
            return Object.entries(newAttributes).every(([key, val]) => v.attributes[key] === val);
        });

        if (exactMatch) {
            onSelect(exactMatch);
        } else {
            // Fuzzy Match: If exact combo doesn't exist (e.g. Blue + Small is OOS),
            // find *any* variant that has the new option value.
            const partialMatch = variants.find(v => v.attributes[groupName] === value);
            if (partialMatch) onSelect(partialMatch);
        }
    };

    return (
        <div className="mb-8 space-y-6">
            {availableGroups.map(groupName => (
                <div key={groupName}>
                    <h3 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide">
                        {groupName}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {getOptionsForGroup(groupName).map(optionValue => {
                            // Is this option currently selected?
                            const isSelected = selectedVariant?.attributes?.[groupName] === optionValue;

                            // Check stock status for this specific option in context of other selections
                            // (Simplified: Just check if this option exists in a stock > 0 variant)
                            // For a perfect UI, you'd verify if (SelectedOtherAttrs + ThisOption) exists.

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