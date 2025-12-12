// components/admin/InventoryLogList.js
'use client';

export default function InventoryLogList({ logs }) {
    if (logs.length === 0) {
        return <p className="text-gray-500 text-center p-4">Không tìm thấy lịch sử nào.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                <tr>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Người dùng</th>
                    <th className="p-3">Sản phẩm / SKU</th>
                    <th className="p-3 text-right">Thay đổi</th>
                    <th className="p-3">Lý do</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-700/30">
                        <td className="p-3 text-gray-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-3 text-gray-300">
                            {log.users ? `${log.users.first_name || ''} ${log.users.last_name || ''}`.trim() || log.users.email : 'Hệ thống'}
                        </td>
                        <td className="p-3">
                            <p className="font-medium text-white">{log.product_variants?.products?.name}</p>
                            <p className="text-xs text-gray-500">
                                {log.product_variants?.sku}
                                {log.product_variants?.formatted_details && (
                                    <span className="text-gray-400 ml-1">
                                        ({log.product_variants.formatted_details})
                                    </span>
                                )}
                            </p>
                        </td>
                        <td className={`p-3 text-right font-bold ${log.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                        </td>
                        <td className="p-3 text-gray-300">{log.reason}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}