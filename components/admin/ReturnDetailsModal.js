// components/admin/ReturnDetailsModal.js
'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';

export default function ReturnDetailsModal({ request, onClose, onUpdate }) {
    const { addToast } = useToast();
    const [adminNotes, setAdminNotes] = useState(request.admin_notes || '');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!request) return null;

    const renderVariantInfo = (variant) => {
        if (!variant) return 'Không xác định';

        let details = [];
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            details = Object.values(variant.attributes);
        }

        return (
            <span>
                <span className="font-mono text-gray-400 mr-2">{variant.sku}</span>
                {details.length > 0 && <span className="text-gray-300">{details.join(' / ')}</span>}
            </span>
        );
    };

    const handleAction = async (status) => {
        const confirmMsg = status === 'approved'
            ? 'Duyệt yêu cầu trả hàng? Kho sẽ được nhập lại.'
            : 'Từ chối yêu cầu trả hàng?';

        if (!confirm(confirmMsg)) return;

        setIsProcessing(true);
        try {
            const response = await fetch(`/api/returns/${request.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, admin_notes: adminNotes })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Thao tác thất bại');
            }
            const { message } = await response.json();

            addToast(message, 'success');
            onUpdate();
            onClose();
        } catch (e) {
            addToast(e.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Yêu cầu trả hàng #{request.id}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Info */}
                    <div className="bg-gray-900/50 p-4 rounded border border-gray-700 text-sm space-y-2">
                        <div className="flex justify-between"><span className="text-gray-400">Mã đơn hàng:</span> <span className="text-white font-mono">#{request.order_id}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Khách hàng:</span> <span className="text-white">{request.users?.email}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Trạng thái:</span> <span className="text-white capitalize">{request.status}</span></div>
                    </div>

                    {/* Reason */}
                    <div>
                        <h3 className="font-semibold mb-2 text-white">Lý do</h3>
                        <p className="p-3 bg-gray-900/50 rounded text-gray-300 text-sm">{request.reason || 'Không cung cấp'}</p>
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="font-semibold mb-2 text-white">Sản phẩm</h3>
                        <div className="space-y-2">
                            {request.return_items.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-900/50 rounded border border-gray-700 text-sm">
                                    <div>
                                        <p className="font-medium text-white mb-1">{item.order_items?.product_variants?.products?.name}</p>
                                        <p className="text-xs">
                                            {renderVariantInfo(item.order_items?.product_variants)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white">SL: {item.quantity}</p>
                                        <p className="text-xs text-gray-500">Nhập kho lại: {item.should_restock ? 'Có' : 'Không'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    {request.status === 'pending' ? (
                        <div>
                            <h3 className="font-semibold mb-2 text-white">Ghi chú quản trị viên</h3>
                            <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
                                rows="3"
                                placeholder="Ghi chú tùy chọn..."
                            />
                        </div>
                    ) : request.admin_notes && (
                        <div>
                            <h3 className="font-semibold mb-2 text-white">Ghi chú quản trị viên</h3>
                            <p className="p-3 bg-gray-900/50 rounded text-gray-300 text-sm">{request.admin_notes}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-900/50 flex justify-between rounded-b-lg">
                    {request.status === 'pending' ? (
                        <div className="flex gap-4">
                            <button onClick={() => handleAction('approved')} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-600">Chấp thuận</button>
                            <button onClick={() => handleAction('rejected')} disabled={isProcessing} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-600">Từ chối</button>
                        </div>
                    ) : <div></div>}
                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Đóng</button>
                </div>
            </div>
        </div>
    );
}