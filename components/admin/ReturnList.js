// components/admin/ReturnList.js
'use client';

export default function ReturnList({ requests, onView }) {
    const getStatusBadge = (status) => {
        const base = "px-2 py-1 text-xs font-semibold rounded-full";
        switch (status) {
            case 'approved': return <span className={`${base} bg-green-900 text-green-200`}>Đã duyệt</span>;
            case 'rejected': return <span className={`${base} bg-red-900 text-red-200`}>Từ chối</span>;
            default: return <span className={`${base} bg-yellow-900 text-yellow-200`}>Chờ xử lý</span>;
        }
    };

    if (requests.length === 0) return <p className="text-gray-500 text-center mt-4">Không tìm thấy yêu cầu nào.</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Đơn hàng</th>
                    <th className="p-3">Khách hàng</th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Hành động</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-700/50 text-sm">
                        <td className="p-3 font-mono text-indigo-400">#{req.id}</td>
                        <td className="p-3 text-gray-300">{new Date(req.created_at).toLocaleDateString('vi-VN')}</td>
                        <td className="p-3 font-mono">#{req.order_id}</td>
                        <td className="p-3 font-medium text-white">{req.users?.email || 'Khách vãng lai'}</td>
                        <td className="p-3 text-gray-300">{req.return_items?.reduce((sum, i) => sum + i.quantity, 0)}</td>
                        <td className="p-3">{getStatusBadge(req.status)}</td>
                        <td className="p-3 text-right">
                            <button onClick={() => onView(req)} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                                Xem
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}