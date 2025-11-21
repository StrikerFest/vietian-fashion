// components/product/VariantSelector.js
'use client';

export default function VariantSelector({ variants, selectedVariant, onSelect }) {
    if (!variants || variants.length === 0) return null;

    return (
        <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide">
                Select Variant
            </h3>
            <div className="flex flex-wrap gap-3">
                {variants.map(variant => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const isOutOfStock = (variant.inventory_levels?.[0]?.on_hand || 0) <= 0;

                    return (
                        <button
                            key={variant.id}
                            onClick={() => onSelect(variant)}
                            disabled={isOutOfStock}
                            className={`
                                relative py-3 px-6 rounded-lg border text-sm font-semibold transition-all duration-200
                                ${isSelected
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/20'
                                : isOutOfStock
                                    ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                            }
                            `}
                        >
                            <span className="block">{variant.color}</span>
                            <span className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-gray-500'}`}>
                                {variant.size}
                            </span>

                            {/* Selection Indicator */}
                            {isSelected && (
                                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-indigo-600 text-xs shadow-sm">
                                    ✓
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}