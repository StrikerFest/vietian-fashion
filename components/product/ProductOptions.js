// components/product/ProductOptions.js
'use client';

import { useState, useEffect } from 'react';

export default function ProductOptions({ productId, variantId, onChange, setIsValid }) {
    const [optionSets, setOptionSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selections, setSelections] = useState({}); // { optionId: "Value" }

    // Fetch Options
    useEffect(() => {
        const fetchOptions = async () => {
            if (!productId || !variantId) return;

            setLoading(true);
            try {
                // Pass variantId to API for secure price-based rule evaluation
                const res = await fetch(`/api/product-options?productId=${productId}&variantId=${variantId}`);
                const data = await res.json();
                setOptionSets(data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchOptions();
    }, [productId, variantId]);

    // Validation & Price Calculation
    useEffect(() => {
        let valid = true;
        const currentSelections = {}; // Flattened for cart

        optionSets.forEach(set => {
            set.product_options.forEach(opt => {
                const val = selections[opt.id];

                // 1. Validation Rule
                if (opt.is_required && (!val || (Array.isArray(val) && val.length === 0))) {
                    valid = false;
                }

                // 2. Cart Payload Construction
                if (val) {
                    let displayValue = val;
                    // Start with the Base Price (New Feature)
                    let priceMod = opt.price_modifier ? parseFloat(opt.price_modifier) : 0;

                    // Add Choice Price (for Radio/Checkbox/Select)
                    if (['radio', 'checkbox_button', 'select'].includes(opt.type)) {
                        const choice = opt.values.find(v => v.label === val);
                        if (choice && choice.price_modifier) {
                            priceMod += parseFloat(choice.price_modifier);
                        }
                    }

                    currentSelections[opt.id] = {
                        label: opt.label,
                        value: displayValue,
                        priceModifier: priceMod
                    };
                }
            });
        });

        setIsValid(valid);
        onChange(currentSelections);
    }, [selections, optionSets, setIsValid, onChange]);

    const handleSelection = (optionId, value) => {
        setSelections(prev => ({ ...prev, [optionId]: value }));
    };

    if (loading) return <div className="h-20 animate-pulse bg-gray-800 rounded mb-6" />;
    if (optionSets.length === 0) return null;

    return (
        <div className="space-y-6 mb-8 border-t border-gray-700 pt-6">
            {optionSets.map(set => (
                <div key={set.id} className="space-y-4">
                    {/* Only show title if it's not generic */}
                    {set.title !== 'General' && <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{set.title}</h3>}

                    {set.product_options.map(opt => (
                        <div key={opt.id}>
                            <label className="block text-sm font-medium text-white mb-2">
                                {opt.label}
                                {/* Show Base Price Modifier if exists */}
                                {opt.price_modifier > 0 && <span className="text-indigo-400 ml-1">(+${opt.price_modifier})</span>}
                                {opt.is_required && <span className="text-red-400 ml-1">*</span>}
                            </label>

                            {/* --- TEXT INPUT --- */}
                            {opt.type === 'text' && (
                                <input
                                    type="text"
                                    maxLength={100} // Prevent huge payloads
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500"
                                    onChange={(e) => handleSelection(opt.id, e.target.value)}
                                    value={selections[opt.id] || ''}
                                    placeholder={`Enter ${opt.label}`}
                                />
                            )}

                            {/* --- TEXTAREA --- */}
                            {opt.type === 'textarea' && (
                                <textarea
                                    maxLength={500}
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500"
                                    rows="3"
                                    onChange={(e) => handleSelection(opt.id, e.target.value)}
                                    value={selections[opt.id] || ''}
                                />
                            )}

                            {/* --- DROPDOWN (SELECT) --- */}
                            {opt.type === 'select' && (
                                <select
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500"
                                    onChange={(e) => handleSelection(opt.id, e.target.value)}
                                    value={selections[opt.id] || ''}
                                >
                                    <option value="">-- Select --</option>
                                    {opt.values.map((val, i) => (
                                        <option key={i} value={val.label}>
                                            {val.label} {val.price_modifier ? `(+$${val.price_modifier})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* --- RADIO / BUTTONS --- */}
                            {(opt.type === 'radio' || opt.type === 'checkbox_button') && (
                                <div className="flex flex-wrap gap-2">
                                    {opt.values.map((val, i) => {
                                        const isSelected = selections[opt.id] === val.label;
                                        const priceText = val.price_modifier ? ` (+${val.price_modifier})` : '';

                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handleSelection(opt.id, val.label)}
                                                className={`
                                                    px-4 py-2 rounded-md border text-sm transition-all
                                                    ${isSelected
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                                                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}
                                                `}
                                            >
                                                {val.label}{priceText}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}