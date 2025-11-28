// components/order/OrderReceipt.js
'use client';

import Link from 'next/link';

export default function OrderReceipt({ order }) {
    const appliedDiscount = order.order_discounts?.[0]?.discounts;
    const shippingAddress = order.addresses;
    let discountAmount = 0;

    if (appliedDiscount && order.subtotal) {
        if (appliedDiscount.type === 'percentage') discountAmount = (order.subtotal * Math.min(Math.max(appliedDiscount.value, 0), 100)) / 100;
        else if (appliedDiscount.type === 'fixed') discountAmount = Math.min(appliedDiscount.value, order.subtotal);
    }

    // Helper to render attributes
    const renderAttributes = (variant) => {
        if (!variant) return null;

        // Use the new dynamic attributes map
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            return (
                <span className="text-sm text-gray-400">
                    {Object.entries(variant.attributes).map(([k, v]) => `${v}`).join(' / ')}
                </span>
            );
        }

        return <span className="text-sm text-gray-500">{variant.sku}</span>;
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/30 text-green-400 mb-4 border border-green-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-4xl font-extrabold text-white mb-2">Order Confirmed!</h1>
                <p className="text-gray-400">Order <span className="font-mono text-indigo-400">#{order.id}</span> has been placed.</p>
            </div>

            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
                <div className="p-6 md:p-8 border-b border-gray-700 bg-gray-800/50">
                    <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>
                    <div className="space-y-4">
                        {order.order_items.map((item, index) => (
                            <div key={index} className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-700 rounded-md flex items-center justify-center text-xs text-gray-400 shrink-0">IMG</div>
                                    <div>
                                        <p className="font-medium text-white">{item.product_variants?.products?.name || 'Item'}</p>
                                        {/* UPDATED ATTRIBUTE DISPLAY */}
                                        {renderAttributes(item.product_variants)}

                                        {/* Custom Options (Engraving, etc) */}
                                        {item.custom_options && Object.keys(item.custom_options).length > 0 && (
                                            <div className="mt-1 space-y-0.5">
                                                {Object.entries(item.custom_options).map(([key, opt]) => (
                                                    <p key={key} className="text-xs text-gray-500">
                                                        <span className="font-semibold">{opt.label}:</span> <span className="text-gray-300">{opt.value}</span>
                                                        {opt.priceModifier > 0 && (
                                                            <span className="text-indigo-400 ml-1">(+${Number(opt.priceModifier).toFixed(2)})</span>
                                                        )}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-medium">${(item.price_at_purchase * item.quantity).toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals & Address Block */}
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6 md:p-8 border-r border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Shipping Details</h3>
                        {shippingAddress ? (
                            <div className="text-white space-y-1">
                                <p>{shippingAddress.address_line_1}</p>
                                {shippingAddress.address_line_2 && <p>{shippingAddress.address_line_2}</p>}
                                <p>{shippingAddress.city}, {shippingAddress.state_province_region} {shippingAddress.postal_code}</p>
                                <p className="font-bold mt-2">{shippingAddress.country}</p>
                            </div>
                        ) : <p className="text-gray-500 italic">Digital / Guest Checkout</p>}
                        <div className="mt-6 pt-6 border-t border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">{order.status}</span>
                        </div>
                    </div>
                    <div className="p-6 md:p-8 bg-gray-700/10">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Cost Breakdown</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-300"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
                            {appliedDiscount && <div className="flex justify-between text-green-400"><span>Discount ({appliedDiscount.code})</span><span>-${discountAmount.toFixed(2)}</span></div>}
                            <div className="flex justify-between text-gray-300"><span>Shipping</span><span>Free</span></div>
                            <div className="pt-4 mt-4 border-t border-gray-700 flex justify-between items-center"><span className="font-bold text-white text-lg">Total</span><span className="font-bold text-white text-2xl">${order.total_amount.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center">
                <Link href="/products" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">&larr; Continue Shopping</Link>
            </div>
        </div>
    );
}