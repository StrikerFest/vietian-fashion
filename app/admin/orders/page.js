// app/admin/orders/page.js
'use client';

import { useState, useEffect } from 'react';
import OrderExport from '@/components/admin/OrderExport';
import OrderDetailsModal from '@/components/admin/OrderDetailsModal';
import OrderStatusBadge from '@/components/OrderStatusBadge';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();
            setOrders(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Callback to update a specific order in the list without refetching everything
    const handleUpdateOrder = (updatedOrder) => {
        setOrders(prevOrders =>
            prevOrders.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
        );
        setSelectedOrder(updatedOrder); // Update the modal view as well
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Orders</h1>

            {/* Export Component */}
            <OrderExport />

            {/* Orders List */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Recent Orders</h2>
                    <span className="text-sm text-gray-400">Total: {orders.length}</span>
                </div>

                {isLoading ? (
                    <p className="text-center py-8 text-gray-400">Loading orders...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                            <tr>
                                <th className="p-3">Order ID</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Customer</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-700/50 text-sm">
                                    <td className="p-3 font-mono text-gray-300">#{order.id}</td>
                                    <td className="p-3 text-gray-300">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 font-medium">{order.users?.email || 'Guest'}</td>
                                    <td className="p-3 text-white font-semibold">${order.total_amount.toFixed(2)}</td>
                                    <td className="p-3"><OrderStatusBadge status={order.status} /></td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {!isLoading && orders.length === 0 && (
                            <p className="text-gray-500 mt-8 text-center">No orders found.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Details Modal */}
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