// components/admin/OrderDetailsModal.js
'use client';

import { useState, useEffect } from 'react';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/utils/format';
// Import the new modal
import CreateReturnModal from '@/components/admin/CreateReturnModal';

export default function OrderDetailsModal({ order, onClose, onUpdateOrder }) {
    const { addToast } = useToast();
    const [shippingCarrier, setShippingCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isSavingTracking, setIsSavingTracking] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

    // State for the new Return Modal
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

    useEffect(() => {
        if (order) {
            setShippingCarrier(order.shipping_carrier || '');
            setTrackingNumber(order.tracking_number || '');
        }
    }, [order]);

    if (!order) return null;

    // ... [EXISTING HELPER FUNCTIONS: renderVariantLabel, getDiscountDetails] ...
    const renderVariantLabel = (variant) => {
        if (!variant) return 'Biến thể không xác định';
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            return Object.entries(variant.attributes)
                .map(([key, val]) => `${val}`)
                .join(' / ');
        }
        return 'Tiêu chuẩn';
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
            text = `Giảm giá (${discountInfo.code} - ${discountValue}%)`;
        } else if (discountInfo.type === 'fixed') {
            amount = Math.min(discountInfo.value, ord.subtotal);
            text = `Giảm giá (${discountInfo.code} - ${formatCurrency(discountInfo.value)})`;
        }
        amount = Math.max(0, amount);
        return { text, amount };
    };

    const discountDetails = getDiscountDetails(order);
    const shippingCost = order.shipping_cost || 0;
    const taxAmount = order.tax_amount || 0;

    // ... [EXISTING HANDLERS: handleSaveTracking, handleConfirmPayment, handleCancelOrder] ...
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
            if (!response.ok) throw new Error('Cập nhật thông tin vận chuyển thất bại');
            const { order: updatedOrder } = await response.json();
            onUpdateOrder(updatedOrder);
            addToast('Đã lưu thông tin vận chuyển thành công!', 'success');
        } catch (error) {
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsSavingTracking(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!confirm('Xác nhận rằng bạn đã nhận được chuyển khoản ngân hàng cho đơn hàng này?')) return;
        setIsConfirmingPayment(true);
        try {
            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'paid' }),
            });
            if (!response.ok) throw new Error('Cập nhật trạng thái đơn hàng thất bại');
            const { order: updatedOrder } = await response.json();
            onUpdateOrder(updatedOrder);
            addToast('Đã xác nhận thanh toán! Đánh dấu đơn hàng là Đã thanh toán.', 'success');
        } catch (error) {
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsConfirmingPayment(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!confirm('Hủy đơn hàng? Hành động này sẽ hoàn lại kho.')) return;
        setIsCancelling(true);
        try {
            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' }),
            });
            if (!response.ok) throw new Error('Hủy đơn hàng thất bại');
            const { order: updatedOrder } = await response.json();
            onUpdateOrder(updatedOrder);
            addToast('Đã hủy đơn hàng thành công!', 'success');
        } catch (error) {
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsCancelling(false);
        }
    };

    // Callback to refresh order details after return creation
    const handleReturnCreated = async () => {
        // Fetch fresh order data to update returned quantities visually
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
                    {/* Payment Verification Helper */}
                    {order.status === 'pending' && (
                        <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-lg">
                            <h3 className="text-yellow-500 font-bold text-sm uppercase mb-2 flex items-center gap-2">
                                ⚠️ Cần xác minh thanh toán
                            </h3>
                            <p className="text-sm text-gray-300 mb-3">
                                Kiểm tra ứng dụng ngân hàng của bạn để tìm giao dịch chuyển khoản với các chi tiết chính xác sau:
                            </p>
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
                        <h3 className="font-semibold mb-2 text-lg text-white">Sản phẩm trong đơn</h3>
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

                                        {/* Display Returned Info */}
                                        {item.returned_quantity > 0 && (
                                            <span className="inline-block mt-1 text-xs text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded border border-orange-800">
                                                Đã trả: {item.returned_quantity}
                                             </span>
                                        )}

                                        {item.custom_options && Object.keys(item.custom_options).length > 0 && (
                                            <div className="mt-2 pl-2 border-l-2 border-indigo-500/50">
                                                {Object.entries(item.custom_options).map(([key, opt]) => (
                                                    <p key={key} className="text-xs text-indigo-300">
                                                        <span className="font-bold text-indigo-200">{opt.label}:</span> {opt.value}
                                                        {opt.priceModifier > 0 && (
                                                            <span className="text-green-400 ml-1 font-bold">[{formatCurrency(opt.priceModifier)}]</span>
                                                        )}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-300 whitespace-nowrap">{item.quantity} x {formatCurrency(item.price_at_purchase)}</p>
                                        <p className="text-white font-bold">{formatCurrency(item.quantity * item.price_at_purchase)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ... [EXISTING UI SECTIONS: Payment Details, Customer Info, Tracking] ... */}
                    {/* Payment Details */}
                    <div>
                        <h3 className="font-semibold mb-2 text-lg text-white">Chi tiết thanh toán</h3>
                        <div className="space-y-1 text-sm bg-gray-900/50 p-4 rounded border border-gray-700">
                            <div className="flex justify-between"><span className="text-gray-400">Tạm tính</span><span className="text-white">{formatCurrency(order.subtotal ?? 0)}</span></div>
                            {discountDetails.text && <div className="flex justify-between text-green-400"><span>{discountDetails.text}</span><span>-{formatCurrency(discountDetails.amount)}</span></div>}

                            <div className="flex justify-between text-gray-400">
                                <span>Vận chuyển</span>
                                <span className="text-white">{formatCurrency(shippingCost)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Thuế</span>
                                <span className="text-white">{formatCurrency(taxAmount)}</span>
                            </div>

                            <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between font-bold text-base text-white"><span>Tổng cộng</span><span>{formatCurrency(order.total_amount)}</span></div>
                        </div>
                    </div>

                    {/* Customer Information Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Address */}
                        <div>
                            <h3 className="font-semibold mb-2 text-lg text-white">Địa chỉ giao hàng</h3>
                            {order.addresses ? (
                                <div className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded border border-gray-700 h-full">
                                    <p className="font-medium text-white mb-1">{order.addresses.address_line_1}</p>
                                    {order.addresses.address_line_2 && <p>{order.addresses.address_line_2}</p>}
                                    <p>{order.addresses.city}, {order.addresses.state_province_region} {order.addresses.postal_code}</p>
                                    <p>{order.addresses.country}</p>
                                </div>
                            ) : <p className="text-sm text-gray-500 italic">Không có địa chỉ.</p>}
                        </div>

                        {/* Contact Info */}
                        <div>
                            <h3 className="font-semibold mb-2 text-lg text-white">Khách hàng</h3>
                            <div className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded border border-gray-700 h-full space-y-2">
                                <div className="flex justify-between border-b border-gray-700 pb-2">
                                    <span className="text-gray-500">ID:</span>
                                    <span className="font-mono text-xs">{order.user_id || 'GUEST'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase mb-0.5">Email</span>
                                    <span className="text-white">{order.order_email || order.user?.email || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase mb-0.5">Điện thoại</span>
                                    <span className="text-white font-mono">{order.receiver_phone || order.user?.phone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tracking */}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <div className="bg-gray-900/50 p-4 rounded border border-gray-700 space-y-3">
                            <h3 className="font-semibold text-white">Cập nhật vận chuyển</h3>
                            <input type="text" value={shippingCarrier} onChange={e => setShippingCarrier(e.target.value)} placeholder="Đơn vị vận chuyển (VD: Viettel Post)" className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" />
                            <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Mã vận đơn" className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" />
                            <button onClick={handleSaveTracking} disabled={isSavingTracking} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-sm w-full">{isSavingTracking ? 'Đang lưu...' : 'Lưu vận chuyển'}</button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-900/50 flex justify-between rounded-b-lg">
                    {/* Actions Area */}
                    <div className="flex gap-3">
                        {/* New Return Button */}
                        {order.status !== 'cancelled' && order.status !== 'pending' && (
                            <button
                                onClick={() => setIsReturnModalOpen(true)}
                                className="bg-orange-700 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded text-sm flex items-center gap-2 border border-orange-600"
                            >
                                ↩ Tạo Yêu Cầu Trả Hàng
                            </button>
                        )}

                        {order.status === 'pending' && (
                            <button
                                onClick={handleConfirmPayment}
                                disabled={isConfirmingPayment}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-600 text-sm flex items-center gap-2"
                            >
                                {isConfirmingPayment ? 'Đang xử lý...' : (
                                    <>
                                        <span>✓</span> Xác nhận thanh toán
                                    </>
                                )}
                            </button>
                        )}

                        {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button onClick={handleCancelOrder} disabled={isCancelling} className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 font-semibold py-2 px-4 rounded disabled:opacity-50 text-sm">
                                {isCancelling ? '...' : 'Hủy đơn hàng'}
                            </button>
                        )}
                    </div>

                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded text-sm">Đóng</button>
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