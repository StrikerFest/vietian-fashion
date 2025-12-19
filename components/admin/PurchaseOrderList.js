// components/admin/PurchaseOrderList.js
'use client';

import Link from 'next/link';
import { formatDate } from '@/utils/format'; // [MODIFIED] Imported

export default function PurchaseOrderList({ orders, onStatusChange, onDelete }) {
    const getStatusColor = (status) => {
        switch(status) {
            case 'draft': return 'bg-gray-600 text-gray-200';
            case 'ordered': return 'bg-blue-600 text-blue-200';
            case 'received': return 'bg-green-600 text-green-200';
            case 'cancelled': return 'bg-red-600 text-red-200';
            default: return 'bg-gray-600';
        }
    };

    if (orders.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">Không tìm thấy đơn nhập hàng nào.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                <tr>
                    <th className="p-3">Mã PO</th>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Nhà cung cấp</th>
                    <th className="p-3">Ngày dự kiến</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Hành động</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {orders.map(po => (
                    <tr key={po.id} className="hover:bg-gray-700/50 text-sm">
                        <td className="p-3 font-mono text-indigo-400">#{po.id}</td>
                        {/* [MODIFIED] Use format util */}
                        <td className="p-3 text-gray-300">{formatDate(po.created_at)}</td>
                        <td className="p-3 font-medium text-white">{po.suppliers?.name}</td>
                        <td className="p-3 text-gray-400">
                            {/* [MODIFIED] Use format util */}
                            {po.expected_date ? formatDate(po.expected_date) : '-'}
                        </td>
                        <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(po.status)}`}>
                                    {po.status === 'draft' ? 'Nháp' :
                                        po.status === 'ordered' ? 'Đã đặt' :
                                            po.status === 'received' ? 'Đã nhận' :
                                                po.status === 'cancelled' ? 'Đã hủy' : po.status}
                                </span>
                        </td>
                        <td className="p-3 text-right space-x-3">
                            {po.status === 'draft' && (
                                <button onClick={() => onStatusChange(po.id, 'ordered')} className="text-blue-400 hover:text-blue-300 font-semibold">Đặt hàng</button>
                            )}
                            {po.status === 'ordered' && (
                                <button onClick={() => onStatusChange(po.id, 'received')} className="text-green-400 hover:text-green-300 font-semibold">Nhập kho</button>
                            )}
                            {po.status !== 'received' && (
                                <button onClick={() => onDelete(po.id)} className="text-red-500 hover:text-red-400 font-semibold">Xóa</button>
                            )}
                            {po.status === 'received' && <span className="text-gray-500 italic">Hoàn tất</span>}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}