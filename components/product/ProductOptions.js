'use client';

import { useState, useEffect } from 'react';

export default function ProductOptions({ productId, productPrice, onChange, setIsValid }) {
    const [optionSets, setOptionSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selections, setSelections] = useState({}); // { optionId: "Value" }

    // Fetch Options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await fetch(`/api/product-options?productId=${productId}&price=${productPrice}`);
                const data = await res.json();
                setOptionSets(data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        if (productId) fetchOptions();
    }, [productId, productPrice]);

    // Validation & Propagation
    useEffect(() => {
        // Check required fields
        let valid = true;
        const currentSelections = {}; // Flattened for cart

        optionSets.forEach(set => {
            set.product_options.forEach(opt => {
                const val = selections[opt.id];

                if (opt.is_required && (!val || (Array.isArray(val) && val.length === 0))) {
                    valid = false;
                }

                // Format for Cart: Label: Value (+Price)
                if (val) {
                    let displayValue = val;
                    let priceMod = 0;

                    // If it's a choice type, find the label and modifier
                    if (['radio', 'checkbox_button'].includes(opt.type)) {
                        const choice = opt.values.find(v => v.label === val);
                        if (choice) {
                            priceMod = choice.price_modifier || 0;
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
                                {opt.is_required && <span className="text-red-400 ml-1">*</span>}
                            </label>

                            {/* RENDER TYPE: TEXT */}
                            {opt.type === 'text' && (
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500"
                                    onChange={(e) => handleSelection(opt.id, e.target.value)}
                                    value={selections[opt.id] || ''}
                                    placeholder={`Enter ${opt.label}`}
                                />
                            )}

                            {/* RENDER TYPE: TEXTAREA */}
                            {opt.type === 'textarea' && (
                                <textarea
                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500"
                                    rows="3"
                                    onChange={(e) => handleSelection(opt.id, e.target.value)}
                                    value={selections[opt.id] || ''}
                                />
                            )}

                            {/* RENDER TYPE: RADIO / BUTTONS */}
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