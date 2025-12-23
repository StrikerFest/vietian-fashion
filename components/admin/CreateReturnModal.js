// components/admin/CreateReturnModal.js
'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/utils/format';

export default function CreateReturnModal({ order, onClose, onSuccess }) {
    const { addToast } = useToast();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State to track selected quantities: { order_item_id: quantity }
    const [selectedQuantities, setSelectedQuantities] = useState({});

    // Filter items that are returnable (purchased - already returned > 0)
    const returnableItems = useMemo(() => {
        if (!order || !order.order_items) return [];
        return order.order_items.map(item => {
            const returned = item.returned_quantity || 0;
            const available = item.quantity - returned;
            return { ...item, availableToReturn: available };
        }).filter(item => item.availableToReturn > 0);
    }, [order]);

    const handleQuantityChange = (itemId, val, max) => {
        const qty = parseInt(val, 10);
        if (isNaN(qty) || qty < 0) return;

        if (qty === 0) {
            const newState = { ...selectedQuantities };
            delete newState[itemId];
            setSelectedQuantities(newState);
        } else {
            setSelectedQuantities(prev => ({
                ...prev,
                [itemId]: Math.min(qty, max)
            }));
        }
    };

    const handleSubmit = async () => {
        const itemsToReturn = Object.entries(selectedQuantities).map(([itemId, qty]) => ({
            order_item_id: parseInt(itemId),
            quantity: qty
        }));

        if (itemsToReturn.length === 0) {
            addToast('Vui lòng chọn ít nhất một sản phẩm để trả.', 'error');
            return;
        }
        if (!reason.trim()) {
            addToast('Vui lòng nhập lý do hoàn trả.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/returns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: order.id,
                    items: itemsToReturn,
                    reason: `[Admin Initiated] ${reason}`
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Thất bại');

            addToast('Tạo yêu cầu trả hàng thành công!', 'success');
            onSuccess(); // Triggers parent refresh
            onClose();
        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (returnableItems.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={onClose}>
                <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-700 text-center" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-white mb-2">Không thể tạo yêu cầu</h3>
                    <p className="text-gray-400 mb-6">Đơn hàng này không còn sản phẩm nào khả dụng để trả lại.</p>
                    <button onClick={onClose} className="bg-gray-700 text-white px-4 py-2 rounded">Đóng</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800 sticky top-0">
                    <h2 className="text-xl font-bold text-white">Tạo Yêu Cầu Trả Hàng (Admin)</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">Chọn sản phẩm và số lượng:</label>
                        {returnableItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700">
                                <div className="flex-1">
                                    <p className="font-medium text-white">{item.product_variants.products.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {item.product_variants.sku}
                                        {/* Simplified variant info here */}
                                    </p>
                                    <p className="text-xs text-indigo-400 mt-1">
                                        Đã mua: {item.quantity} | Đã trả: {item.returned_quantity}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500">Tối đa: {item.availableToReturn}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max={item.availableToReturn}
                                        value={selectedQuantities[item.id] || ''}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value, item.availableToReturn)}
                                        placeholder="0"
                                        className="w-16 bg-gray-700 border border-gray-600 rounded p-1 text-center text-white"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Lý do trả hàng / Ghi chú:</label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows="3"
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
                            placeholder="Nhập lý do khách hàng yêu cầu..."
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-700 bg-gray-800 flex justify-end gap-3 sticky bottom-0">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium">
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-bold disabled:opacity-50"
                    >
                        {isSubmitting ? 'Đang xử lý...' : 'Tạo Yêu Cầu'}
                    </button>
                </div>
            </div>
        </div>
    );
}