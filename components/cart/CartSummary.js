// components/cart/CartSummary.js
'use client';

import { useState } from 'react';

export default function CartSummary({
                                        subtotal,
                                        discountAmount,
                                        total,
                                        appliedDiscount,
                                        onApplyDiscount,
                                        onRemoveDiscount,
                                        onCheckout,
                                        isCheckingOut,
                                        session,
                                        hasSelectedAddress
                                    }) {
    const [discountInput, setDiscountInput] = useState('');
    const [discountMessage, setDiscountMessage] = useState({ type: '', text: '' });
    const [isApplying, setIsApplying] = useState(false);

    const handleApply = async (e) => {
        e.preventDefault();
        if (!discountInput.trim()) return;

        setIsApplying(true);
        setDiscountMessage({ type: '', text: '' });

        // We assume onApplyDiscount returns a result object { success, message }
        const result = await onApplyDiscount(discountInput);

        setDiscountMessage({
            type: result.success ? 'success' : 'error',
            text: result.message
        });
        setIsApplying(false);
    };

    const handleRemove = () => {
        onRemoveDiscount();
        setDiscountInput('');
        setDiscountMessage({ type: '', text: '' });
    };

    const canCheckout = session ? hasSelectedAddress : true; // Guests can always proceed (address logic handled differently for guests if needed)

    return (
        <div className="bg-gray-800 p-6 rounded-lg sticky top-24 border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

            {/* Discount Input */}
            <div className="mb-6 pb-6 border-b border-gray-700">
                {!appliedDiscount ? (
                    <form onSubmit={handleApply}>
                        <label htmlFor="discount-code" className="block text-xs font-medium mb-2 text-gray-400 uppercase tracking-wide">Discount Code</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="discount-code"
                                value={discountInput}
                                onChange={(e) => setDiscountInput(e.target.value)}
                                placeholder="e.g. SUMMER20"
                                className="flex-grow bg-gray-900 border border-gray-600 text-white text-sm rounded-md p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                                disabled={isApplying}
                            />
                            <button
                                type="submit"
                                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md text-sm disabled:opacity-50 transition-colors"
                                disabled={isApplying || !discountInput}
                            >
                                {isApplying ? '...' : 'Apply'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="bg-green-900/20 border border-green-800 rounded-md p-3 flex justify-between items-center">
                        <div>
                            <span className="block text-xs text-green-400 font-bold uppercase">Discount Applied</span>
                            <span className="font-mono text-white text-sm">{appliedDiscount.code}</span>
                        </div>
                        <button
                            onClick={handleRemove}
                            className="text-gray-400 hover:text-red-400 text-xs font-semibold transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                )}

                {discountMessage.text && (
                    <p className={`mt-2 text-xs ${discountMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                        {discountMessage.text}
                    </p>
                )}
            </div>

            {/* Calculations */}
            <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>

                {appliedDiscount && (
                    <div className="flex justify-between text-green-400">
                        <span>Discount</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                )}

                <div className="flex justify-between text-gray-400">
                    <span>Shipping</span>
                    <span className="text-white font-medium">Free</span>
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4 flex justify-between items-end">
                    <span className="text-white font-bold text-lg">Total</span>
                    <span className="text-2xl font-extrabold text-white">${total.toFixed(2)}</span>
                </div>
            </div>

            {/* Checkout Button */}
            <button
                onClick={onCheckout}
                disabled={isCheckingOut || !canCheckout}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 transition-all shadow-lg hover:shadow-indigo-900/30"
            >
                {isCheckingOut ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Processing...
                    </span>
                ) : (
                    'Complete Purchase'
                )}
            </button>

            {/* Validation Message */}
            {session && !hasSelectedAddress && (
                <p className="text-xs text-red-400 text-center mt-3 bg-red-900/10 p-2 rounded border border-red-900/30">
                    Please select a shipping address to continue.
                </p>
            )}
        </div>
    );
}