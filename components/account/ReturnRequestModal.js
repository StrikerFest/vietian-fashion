// components/account/ReturnRequestModal.js
'use client';

import { useState } from 'react';

export default function ReturnRequestModal({ isOpen, onClose, order, onSuccess }) {
    const [reason, setReason] = useState('');
    const [selectedItems, setSelectedItems] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !order) return null;

    const handleQuantityChange = (itemId, maxQty, newQty) => {
        const qty = parseInt(newQty);
        if (isNaN(qty) || qty < 0) return;

        setSelectedItems(prev => {
            const next = { ...prev };
            if (qty === 0) delete next[itemId];
            else next[itemId] = Math.min(qty, maxQty);
            return next;
        });
    };

    const handleToggleItem = (itemId, maxQty) => {
        setSelectedItems(prev => {
            const next = { ...prev };
            if (next[itemId]) delete next[itemId];
            else next[itemId] = maxQty;
            return next;
        });
    };

    // Helper to render label
    const renderVariantLabel = (variant) => {
        if (!variant) return '';
        // Check for attributes map (populated by order page logic)
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            return Object.values(variant.attributes).join(' / ');
        }
        return variant.sku;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const itemsToReturn = Object.entries(selectedItems).map(([itemId, qty]) => ({
            order_item_id: parseInt(itemId),
            quantity: qty
        }));

        if (itemsToReturn.length === 0) {
            setError('Please select at least one item to return.');
            setIsSubmitting(false);
            return;
        }

        if (!reason.trim()) {
            setError('Please provide a reason for the return.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/returns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: order.id,
                    items: itemsToReturn,
                    reason: reason
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit return request.');
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Request Return</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Select Items to Return</label>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {order.order_items.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded border border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={!!selectedItems[item.id]}
                                            onChange={() => handleToggleItem(item.id, item.quantity)}
                                            className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="text-sm">
                                            <p className="font-medium text-white">{item.product_variants?.products?.name}</p>
                                            <p className="text-gray-400 text-xs">
                                                {renderVariantLabel(item.product_variants)}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedItems[item.id] && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-gray-400">Qty:</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={item.quantity}
                                                value={selectedItems[item.id]}
                                                onChange={(e) => handleQuantityChange(item.id, item.quantity, e.target.value)}
                                                className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-center"
                                            />
                                            <span className="text-xs text-gray-500">/ {item.quantity}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Return</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows="3"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Wrong size, damaged, changed mind..."
                            required
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}