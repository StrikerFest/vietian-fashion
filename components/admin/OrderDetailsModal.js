// components/admin/OrderDetailsModal.js
'use client';

import { useState, useEffect } from 'react';
import OrderStatusBadge from '@/components/OrderStatusBadge';

export default function OrderDetailsModal({ order, onClose, onUpdateOrder }) {
    const [shippingCarrier, setShippingCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isSavingTracking, setIsSavingTracking] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        if (order) {
            setShippingCarrier(order.shipping_carrier || '');
            setTrackingNumber(order.tracking_number || '');
        }
    }, [order]);

    if (!order) return null;

    // Helper to render variant details dynamically
    const renderVariantLabel = (variant) => {
        if (!variant) return 'Unknown Variant';

        // 1. Dynamic Attributes (New System)
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            return Object.entries(variant.attributes)
                .map(([key, val]) => `${val}`) // Display "Red / L"
                .join(' / ');
        }

        // 2. Last Resort
        return 'Standard';
    };

    const getDiscountDetails = (ord) => {
        if (!ord || !ord.order_discounts || ord.order_discounts.length === 0) {
            return { text: null, amount: 0 };
        }
        const discountInfo = ord.order_discounts[0]?.discounts;
        if (!discountInfo || ord.subtotal === undefined) {
            return { text: null, amount: 0 };
        }
        let amount = 0;
        let text = '';
        if (discountInfo.type === 'percentage') {
            const discountValue = Math.min(Math.max(discountInfo.value, 0), 100);
            amount = (ord.subtotal * discountValue) / 100;
            text = `Discount (${discountInfo.code} - ${discountValue}%)`;
        } else if (discountInfo.type === 'fixed') {
            amount = Math.min(discountInfo.value, ord.subtotal);
            text = `Discount (${discountInfo.code} - $${Number(discountInfo.value).toFixed(2)})`;
        }
        amount = Math.max(0, amount);
        return { text, amount };
    };

    const discountDetails = getDiscountDetails(order);

    const handleSaveTracking = async () => {
        if (!shippingCarrier && !trackingNumber) {
            alert('Please enter Shipping Carrier or Tracking Number.');
            return;
        }
        setIsSavingTracking(true);
        try {
            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipping_carrier: shippingCarrier, tracking_number: trackingNumber }),
            });
            if (!response.ok) throw new Error('Failed to update tracking info');
            const { order: updatedOrder } = await response.json();
            onUpdateOrder(updatedOrder);
            alert('Tracking information saved successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsSavingTracking(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!confirm('Cancel order? This will restock items.')) return;
        setIsCancelling(true);
        try {
            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' }),
            });
            if (!response.ok) throw new Error('Failed to cancel order');
            const { order: updatedOrder } = await response.json();
            onUpdateOrder(updatedOrder);
            alert('Order cancelled successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
                    <h2 className="text-2xl font-bold text-white">Order #{order.id}</h2>
                    <div className="flex items-center gap-4">
                        <OrderStatusBadge status={order.status} />
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Order Items */}
                    <div>
                        <h3 className="font-semibold mb-2 text-lg text-white">Order Items</h3>
                        <div className="space-y-2">
                            {order.order_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-sm p-3 bg-gray-900/50 rounded border border-gray-700">
                                    <div>
                                        <p className="font-medium text-white">{item.product_variants.products.name}</p>
                                        <p className="text-gray-400 flex items-center gap-2">
                                            <span className="font-mono text-xs text-gray-500">{item.product_variants.sku}</span>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-gray-300">
                                                {renderVariantLabel(item.product_variants)}
                                            </span>
                                        </p>

                                        {/* Custom Options (Engraving, etc.) */}
                                        {item.custom_options && Object.keys(item.custom_options).length > 0 && (
                                            <div className="mt-2 pl-2 border-l-2 border-indigo-500/50">
                                                {Object.entries(item.custom_options).map(([key, opt]) => (
                                                    <p key={key} className="text-xs text-indigo-300">
                                                        <span className="font-bold text-indigo-200">{opt.label}:</span> {opt.value}
                                                        {opt.priceModifier > 0 && (
                                                            <span className="text-green-400 ml-1 font-bold">[+${Number(opt.priceModifier).toFixed(2)}]</span>
                                                        )}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-300 whitespace-nowrap">{item.quantity} x ${item.price_at_purchase.toFixed(2)}</p>
                                        <p className="text-white font-bold">${(item.quantity * item.price_at_purchase).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div>
                        <h3 className="font-semibold mb-2 text-lg text-white">Payment Details</h3>
                        <div className="space-y-1 text-sm bg-gray-900/50 p-4 rounded border border-gray-700">
                            <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-white">${order.subtotal?.toFixed(2) ?? '0.00'}</span></div>
                            {discountDetails.text && <div className="flex justify-between text-green-400"><span>{discountDetails.text}</span><span>-${discountDetails.amount.toFixed(2)}</span></div>}
                            <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between font-bold text-base text-white"><span>Grand Total</span><span>${order.total_amount.toFixed(2)}</span></div>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h3 className="font-semibold mb-2 text-lg text-white">Shipping Address</h3>
                        {order.addresses ? (
                            <div className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded border border-gray-700">
                                <p className="font-medium text-white mb-1">{order.addresses.address_line_1}</p>
                                {order.addresses.address_line_2 && <p>{order.addresses.address_line_2}</p>}
                                <p>{order.addresses.city}, {order.addresses.state_province_region} {order.addresses.postal_code}</p>
                                <p>{order.addresses.country}</p>
                            </div>
                        ) : <p className="text-sm text-gray-500 italic">No address provided.</p>}
                    </div>

                    {/* Tracking */}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <div className="bg-gray-900/50 p-4 rounded border border-gray-700 space-y-3">
                            <h3 className="font-semibold text-white">Update Tracking</h3>
                            <input type="text" value={shippingCarrier} onChange={e => setShippingCarrier(e.target.value)} placeholder="Carrier (e.g. FedEx)" className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" />
                            <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Tracking Number" className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" />
                            <button onClick={handleSaveTracking} disabled={isSavingTracking} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-sm w-full">{isSavingTracking ? 'Saving...' : 'Save Tracking'}</button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center rounded-b-lg">
                    {order.status !== 'cancelled' && order.status !== 'delivered' ? (
                        <button onClick={handleCancelOrder} disabled={isCancelling} className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 font-semibold py-2 px-4 rounded disabled:opacity-50 text-sm">
                            {isCancelling ? '...' : 'Cancel Order'}
                        </button>
                    ) : <div></div>}
                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded text-sm">Close</button>
                </div>
            </div>
        </div>
    );
}