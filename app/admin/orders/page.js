// app/admin/orders/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import OrderExport from '@/components/admin/OrderExport';
import OrderDetailsModal from '@/components/admin/OrderDetailsModal';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import PaginationControls from '@/components/ui/PaginationControls';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/utils/format';

export default function OrdersPage() {
    const { addToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/orders?page=${page}&limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch orders');

            const result = await response.json();

            if (result.data) {
                setOrders(result.data);
                setTotalItems(result.meta.total);
                setTotalPages(result.meta.totalPages);
            } else {
                setOrders(result || []);
            }
        } catch (error) {
            console.error(error);
            addToast('Không thể tải danh sách đơn hàng.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, addToast]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleUpdateOrder = (updatedOrder) => {
        setOrders(prevOrders =>
            prevOrders.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
        );
        setSelectedOrder(updatedOrder);
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Quản lý Đơn hàng</h1>

            <OrderExport />

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Đơn hàng gần đây</h2>
                    <span className="text-sm text-gray-400">Tổng đơn hàng: {totalItems}</span>
                </div>

                {isLoading ? (
                    <p className="text-center py-8 text-gray-400">Đang tải đơn hàng...</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                                <tr>
                                    <th className="p-3">Mã ĐH</th>
                                    <th className="p-3">Ngày</th>
                                    <th className="p-3">Khách hàng</th>
                                    <th className="p-3">Tổng tiền</th>
                                    <th className="p-3">Trạng thái</th>
                                    <th className="p-3 text-right">Hành động</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                {orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-700/50 text-sm">
                                        <td className="p-3 font-mono text-gray-300">#{order.id}</td>
                                        <td className="p-3 text-gray-300">{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                                        <td className="p-3 font-medium">{order.users?.email || 'Khách vãng lai'}</td>
                                        <td className="p-3 text-white font-semibold">{formatCurrency(order.total_amount)}</td>
                                        <td className="p-3"><OrderStatusBadge status={order.status} /></td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            {!isLoading && orders.length === 0 && (
                                <p className="text-gray-500 mt-8 text-center">Không tìm thấy đơn hàng nào.</p>
                            )}
                        </div>

                        <PaginationControls
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            limit={limit}
                            onPageChange={handlePageChange}
                            onLimitChange={handleLimitChange}
                            isLoading={isLoading}
                        />
                    </>
                )}
            </div>

            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdateOrder={handleUpdateOrder}
                />
            )}
        </div>
    );
}