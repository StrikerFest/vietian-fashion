// components/cart/CartSummary.js
'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/utils/format';

export default function CartSummary({
                                        subtotal,
                                        discountAmount,
                                        appliedDiscount,
                                        onApplyDiscount,
                                        onRemoveDiscount,
                                        onCheckout,
                                        isCheckingOut,
                                        session,
                                        hasSelectedAddress,
                                        // --- NEW PROPS ---
                                        paymentMethod,
                                        setPaymentMethod
                                    }) {
    const [discountInput, setDiscountInput] = useState('');
    const [discountMessage, setDiscountMessage] = useState({ type: '', text: '' });
    const [isApplying, setIsApplying] = useState(false);

    // Tax and Shipping State
    const [config, setConfig] = useState({ taxRate: 0, shippingCost: 0, freeShippingThreshold: 0 });

    useEffect(() => {
        // Fetch configuration client-side to update summary display
        fetch('/api/settings?key=tax_config')
            .then(res => res.json())
            .then(data => {
                if (data && data.value) setConfig(data.value);
            })
            .catch(err => console.error("Failed to load tax config", err));
    }, []);

    // --- Dynamic Calculations ---
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = (taxableAmount * (config.taxRate || 0)) / 100;

    let shippingCost = parseFloat(config.shippingCost || 0);
    const freeShippingThreshold = parseFloat(config.freeShippingThreshold || 0);

    if (freeShippingThreshold > 0 && taxableAmount >= freeShippingThreshold) {
        shippingCost = 0;
    }

    // Client-side total (Note: Server recalculates this for security)
    const finalTotal = taxableAmount + taxAmount + shippingCost;

    const handleApply = async (e) => {
        e.preventDefault();
        if (!discountInput.trim()) return;

        setIsApplying(true);
        setDiscountMessage({ type: '', text: '' });

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

    const canCheckout = session ? hasSelectedAddress : true;

    return (
        <div className="bg-gray-800 p-6 rounded-lg sticky top-24 border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6">Tóm tắt đơn hàng</h2>

            {/* Discount Input */}
            <div className="mb-6 pb-6 border-b border-gray-700">
                {!appliedDiscount ? (
                    <form onSubmit={handleApply}>
                        <label htmlFor="discount-code" className="block text-xs font-medium mb-2 text-gray-400 uppercase tracking-wide">Mã giảm giá</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="discount-code"
                                value={discountInput}
                                onChange={(e) => setDiscountInput(e.target.value)}
                                placeholder="VD: SUMMER20"
                                className="flex-grow bg-gray-900 border border-gray-600 text-white text-sm rounded-md p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                                disabled={isApplying}
                            />
                            <button
                                type="submit"
                                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md text-sm disabled:opacity-50 transition-colors"
                                disabled={isApplying || !discountInput}
                            >
                                {isApplying ? '...' : 'Áp dụng'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="bg-green-900/20 border border-green-800 rounded-md p-3 flex justify-between items-center">
                        <div>
                            <span className="block text-xs text-green-400 font-bold uppercase">Đã áp dụng mã</span>
                            <span className="font-mono text-white text-sm">{appliedDiscount.code}</span>
                        </div>
                        <button
                            onClick={handleRemove}
                            className="text-gray-400 hover:text-red-400 text-xs font-semibold transition-colors"
                        >
                            Xóa
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
                    <span>Tạm tính</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>

                {appliedDiscount && (
                    <div className="flex justify-between text-green-400">
                        <span>Giảm giá</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                )}

                <div className="flex justify-between text-gray-400">
                    <span>Vận chuyển</span>
                    {shippingCost === 0 ? (
                        <span className="text-green-400 font-medium">Miễn phí</span>
                    ) : (
                        <span className="text-white font-medium">{formatCurrency(shippingCost)}</span>
                    )}
                </div>

                <div className="flex justify-between text-gray-400">
                    <span>Thuế ước tính ({config.taxRate}%)</span>
                    <span className="text-white font-medium">{formatCurrency(taxAmount)}</span>
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4 flex justify-between items-end">
                    <span className="text-white font-bold text-lg">Tổng cộng</span>
                    <span className="text-2xl font-extrabold text-white">{formatCurrency(finalTotal)}</span>
                </div>
            </div>

            {/* --- PAYMENT METHOD SELECTION --- */}
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Phương thức thanh toán</h3>
                <div className="space-y-3">
                    {/* Option 1: COD */}
                    <label className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'cod' ? 'bg-indigo-900/20 border-indigo-500' : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}>
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="cod"
                                checked={paymentMethod === 'cod'}
                                onChange={() => setPaymentMethod('cod')}
                                className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-500 focus:ring-indigo-500 focus:ring-2"
                            />
                            <span className="text-sm font-medium text-white">Thanh toán khi nhận hàng (COD)</span>
                        </div>
                        <span className="text-xl">🚚</span>
                    </label>

                    {/* Option 2: VietQR */}
                    <label className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'vietqr' ? 'bg-indigo-900/20 border-indigo-500' : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}>
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="vietqr"
                                checked={paymentMethod === 'vietqr'}
                                onChange={() => setPaymentMethod('vietqr')}
                                className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-500 focus:ring-indigo-500 focus:ring-2"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-white">Chuyển khoản ngân hàng</span>
                                <span className="text-xs text-indigo-400">Quét mã QR VietQR</span>
                            </div>
                        </div>
                        <span className="text-xl">🏦</span>
                    </label>
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
                        Đang xử lý...
                    </span>
                ) : (
                    'Hoàn tất thanh toán'
                )}
            </button>

            {session && !hasSelectedAddress && (
                <p className="text-xs text-red-400 text-center mt-3 bg-red-900/10 p-2 rounded border border-red-900/30">
                    Vui lòng chọn địa chỉ giao hàng để tiếp tục.
                </p>
            )}
        </div>
    );
}