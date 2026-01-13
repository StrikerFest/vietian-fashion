// components/admin/OrderDetailsModal.js
'use client';

import { useState, useEffect } from 'react';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/utils/format';
import CreateReturnModal from '@/components/admin/CreateReturnModal';

export default function OrderDetailsModal({ order, onClose, onUpdateOrder }) {
    const { addToast } = useToast();
    const [shippingCarrier, setShippingCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');

    // Unified loading state for status actions
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isSavingTracking, setIsSavingTracking] = useState(false);

    // State for Return Modal
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

    useEffect(() => {
        if (order) {
            setShippingCarrier(order.shipping_carrier || '');
            setTrackingNumber(order.tracking_number || '');
        }
    }, [order]);

    if (!order) return null;

    // --- Helpers ---
    const renderVariantLabel = (variant) => {
        if (!variant) return 'Biến thể không xác định';
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            return Object.entries(variant.attributes).map(([key, val]) => `${val}`).join(' / ');
        }
        return 'Tiêu chuẩn';
    };

    const getDiscountDetails = (ord) => {
        if (!ord?.order_discounts?.length) return { text: null, amount: 0 };
        const discountInfo = ord.order_discounts[0]?.discounts;
        if (!discountInfo || ord.subtotal === undefined) return { text: null, amount: 0 };

        let amount = 0, text = '';
        if (discountInfo.type === 'percentage') {
            const val = Math.min(Math.max(discountInfo.value, 0), 100);
            amount = (ord.subtotal * val) / 100;
            text = `Giảm giá (${discountInfo.code} - ${val}%)`;
        } else {
            amount = Math.min(discountInfo.value, ord.subtotal);
            text = `Giảm giá (${discountInfo.code} - ${formatCurrency(discountInfo.value)})`;
        }
        return { text, amount: Math.max(0, amount) };
    };

    const discountDetails = getDiscountDetails(order);

    // --- Actions ---

    /**
     * Generic handler to switch order status
     */
    const handleUpdateStatus = async (newStatus, confirmMessage) => {
        if (confirmMessage && !confirm(confirmMessage)) return;

        // Validation for 'shipped' status
        if (newStatus === 'shipped' && !trackingNumber && !shippingCarrier) {
            if(!confirm("Bạn chưa nhập Mã vận đơn hoặc Đơn vị vận chuyển. Tiếp tục đánh dấu là 'Đã vận chuyển'?")) {
                return;
            }
        }

        setIsUpdatingStatus(true);
        try {
            const body = { status: newStatus };

            // If marking shipped, also save tracking info if present
            if (newStatus === 'shipped') {
                body.shipping_carrier = shippingCarrier;
                body.tracking_number = trackingNumber;
            }

            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error('Cập nhật trạng thái thất bại');

            const { order: updatedOrder } = await response.json();
            onUpdateOrder(updatedOrder);

            // Success Messages based on status
            const messages = {
                paid: 'Đã xác nhận thanh toán!',
                shipped: 'Đơn hàng đã chuyển sang trạng thái Vận chuyển.',
                delivered: 'Đơn hàng đã hoàn tất (Giao hàng thành công).',
                cancelled: 'Đã hủy đơn hàng.'
            };
            addToast(messages[newStatus] || 'Cập nhật thành công', 'success');

        } catch (error) {
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleSaveTracking = async () => {
        if (!shippingCarrier && !trackingNumber) {
            addToast('Vui lòng nhập Đơn vị vận chuyển hoặc Mã vận đơn.', 'error');
            return;
        }
        setIsSavingTracking(true);
        try {
            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipping_carrier: shippingCarrier, tracking_number: trackingNumber }),
            });
            if (!response.ok) throw new Error('Failed');
            const { order: updatedOrder } = await response.json();
            onUpdateOrder(updatedOrder);
            addToast('Đã lưu thông tin vận chuyển!', 'success');
        } catch (e) {
            addToast(e.message, 'error');
        } finally {
            setIsSavingTracking(false);
        }
    };

    const handleReturnCreated = async () => {
        try {
            const res = await fetch(`/api/orders/${order.id}`);
            if(res.ok) {
                const { order: refreshedOrder } = await res.json();
                onUpdateOrder(refreshedOrder);
            }
        } catch(e) { console.error(e); }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
                    <h2 className="text-2xl font-bold text-white">Đơn hàng #{order.id}</h2>
                    <div className="flex items-center gap-4">
                        <OrderStatusBadge status={order.status} />
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Payment Alert */}
                    {order.status === 'pending' && (
                        <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-lg">
                            <h3 className="text-yellow-500 font-bold text-sm uppercase mb-2 flex items-center gap-2">⚠️ Cần xác minh thanh toán</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-900 p-2 rounded border border-gray-700">
                                    <span className="block text-xs text-gray-500">Số tiền mong đợi</span>
                                    <span className="font-mono text-white font-bold">{formatCurrency(order.total_amount)}</span>
                                </div>
                                <div className="bg-gray-900 p-2 rounded border border-gray-700">
                                    <span className="block text-xs text-gray-500">Nội dung / Ghi chú</span>
                                    <span className="font-mono text-white font-bold">ĐƠN HÀNG {order.id}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order Items */}
                    <div>
                        <h3 className="font-semibold mb-2 text-lg text-white">Sản phẩm</h3>
                        <div className="space-y-2">
                            {order.order_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-sm p-3 bg-gray-900/50 rounded border border-gray-700">
                                    <div>
                                        <p className="font-medium text-white">{item.product_variants.products.name}</p>
                                        <p className="text-gray-400 text-xs">
                                            {item.product_variants.sku} • {renderVariantLabel(item.product_variants)}
                                        </p>
                                        {item.returned_quantity > 0 && (
                                            <span className="inline-block mt-1 text-xs text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded border border-orange-800">
                                                Đã trả: {item.returned_quantity}
                                             </span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-300">{item.quantity} x {formatCurrency(item.price_at_purchase)}</p>
                                        <p className="text-white font-bold">{formatCurrency(item.quantity * item.price_at_purchase)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Customer & Address */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2 text-lg text-white">Địa chỉ giao hàng</h3>
                            {order.addresses ? (
                                <div className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded border border-gray-700 h-full">
                                    <p className="font-medium text-white mb-1">{order.addresses.address_line_1}</p>
                                    <p>{order.addresses.city}, {order.addresses.state_province_region}</p>
                                    <p>{order.addresses.country}</p>
                                </div>
                            ) : <p className="text-gray-500 italic">Không có địa chỉ.</p>}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2 text-lg text-white">Khách hàng</h3>
                                <div className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded border border-gray-700">
                                    <p className="text-gray-500 text-xs uppercase">Email</p>
                                    <p className="text-white mb-2">{order.order_email || order.user?.email || 'N/A'}</p>
                                    <p className="text-gray-500 text-xs uppercase">Điện thoại</p>
                                    <p className="text-white font-mono">{order.receiver_phone || order.user?.phone || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Payment Method Section */}
                            <div>
                                <h3 className="font-semibold mb-2 text-lg text-white">Thanh toán</h3>
                                <div className="flex items-center justify-between text-sm bg-gray-900/50 p-4 rounded border border-gray-700">
                                    <span className="text-gray-400 uppercase text-xs font-bold">Phương thức:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">
                                            {order.payment_method === 'vietqr' ? '💳 Chuyển khoản VietQR' : '🚚 Thanh toán COD'}
                                        </span>
                                        {order.status !== 'pending' && order.status !== 'cancelled' && (
                                            <span className="text-[10px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded border border-green-800 font-bold uppercase">
                                                Đã thanh toán {formatCurrency(order.total_amount)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tracking Input */}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <div className="bg-gray-900/50 p-4 rounded border border-gray-700 space-y-3">
                            <h3 className="font-semibold text-white">Cập nhật vận chuyển</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={shippingCarrier}
                                    onChange={e => setShippingCarrier(e.target.value)}
                                    placeholder="Đơn vị vận chuyển"
                                    className="bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm"
                                />
                                <input
                                    type="text"
                                    value={trackingNumber}
                                    onChange={e => setTrackingNumber(e.target.value)}
                                    placeholder="Mã vận đơn"
                                    className="bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm"
                                />
                            </div>
                            <button
                                onClick={handleSaveTracking}
                                disabled={isSavingTracking}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-sm w-full font-medium"
                            >
                                {isSavingTracking ? 'Đang lưu...' : 'Lưu thông tin vận chuyển'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-900/50 flex flex-wrap justify-between items-center rounded-b-lg gap-2">
                    <div className="flex gap-2">
                        {/* 1. CONFIRM PAYMENT (Pending -> Paid) */}
                        {order.status === 'pending' && (
                            <button
                                onClick={() => handleUpdateStatus('paid', 'Xác nhận đã nhận được tiền?')}
                                disabled={isUpdatingStatus}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm"
                            >
                                ✓ Xác nhận thanh toán
                            </button>
                        )}

                        {/* 2. MARK SHIPPED (Paid -> Shipped) */}
                        {order.status === 'paid' && (
                            <button
                                onClick={() => handleUpdateStatus('shipped', 'Xác nhận đơn hàng đã được giao cho đơn vị vận chuyển?')}
                                disabled={isUpdatingStatus}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm flex items-center gap-2"
                            >
                                🚚 Bắt đầu giao hàng (Ship)
                            </button>
                        )}

                        {/* 3. MARK DELIVERED (Shipped -> Delivered) */}
                        {order.status === 'shipped' && (
                            <button
                                onClick={() => handleUpdateStatus('delivered', 'Xác nhận khách đã nhận được hàng? Hành động này sẽ hoàn tất đơn hàng.')}
                                disabled={isUpdatingStatus}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded text-sm flex items-center gap-2"
                            >
                                🎉 Đã giao hàng thành công
                            </button>
                        )}

                        {/* Return Action */}
                        {['paid', 'shipped', 'delivered'].includes(order.status) && (
                            <button
                                onClick={() => setIsReturnModalOpen(true)}
                                className="bg-orange-700/80 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded text-sm border border-orange-600/50"
                            >
                                ↩ Trả hàng
                            </button>
                        )}

                        {/* Cancel Action */}
                        {['pending', 'paid'].includes(order.status) && (
                            <button
                                onClick={() => handleUpdateStatus('cancelled', 'Bạn có chắc muốn hủy đơn hàng này không?')}
                                disabled={isUpdatingStatus}
                                className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 font-medium py-2 px-4 rounded text-sm"
                            >
                                Hủy đơn
                            </button>
                        )}
                    </div>

                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded text-sm">
                        Đóng
                    </button>
                </div>
            </div>

            {/* Nested Return Modal */}
            {isReturnModalOpen && (
                <CreateReturnModal
                    order={order}
                    onClose={() => setIsReturnModalOpen(false)}
                    onSuccess={handleReturnCreated}
                />
            )}
        </div>
    );
}