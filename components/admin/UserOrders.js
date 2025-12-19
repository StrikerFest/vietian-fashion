// components/admin/UserOrders.js
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { formatCurrency, formatDate } from '@/utils/format'; // [MODIFIED] Imported formatDate

export default function UserOrders({ orders }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 h-full">
            <h2 className="text-xl font-semibold mb-4 text-white">Lịch sử đơn hàng</h2>

            {orders && orders.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
                        <tr>
                            <th className="p-3">Mã ĐH</th>
                            <th className="p-3">Ngày</th>
                            <th className="p-3">Tổng tiền</th>
                            <th className="p-3">Trạng thái</th>
                            <th className="p-3">Sản phẩm</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-700/50">
                                <td className="p-3 font-mono text-indigo-400">#{order.id}</td>
                                {/* [MODIFIED] Use format util */}
                                <td className="p-3 text-gray-300">
                                    {formatDate(order.created_at)}
                                </td>
                                <td className="p-3 font-medium text-white">
                                    {formatCurrency(order.total_amount)}
                                </td>
                                <td className="p-3">
                                    <OrderStatusBadge status={order.status} />
                                </td>
                                <td className="p-3 text-gray-400">
                                    {/* Check if order_items exists and has count from the query, otherwise fallback */}
                                    {order.order_items?.[0]?.count
                                        ? `${order.order_items[0].count} món`
                                        : 'Xem chi tiết'}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="text-gray-500">Chưa có đơn hàng nào.</p>
                </div>
            )}
        </div>
    );
}