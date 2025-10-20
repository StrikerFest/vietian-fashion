// app/admin/orders/page.js
'use client';

import { useState, useEffect } from 'react';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null); // For the details modal

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/orders');
                if (!response.ok) throw new Error('Failed to fetch orders');
                const data = await response.json();
                setOrders(data || []);
            } catch (error) {
                console.error(error);
            }
            setIsLoading(false);
        };
        fetchOrders();
    }, []);

    const OrderStatusBadge = ({ status }) => {
        const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
        switch (status?.toLowerCase()) {
            case 'paid': return <span className={`${baseClasses} bg-green-800 text-green-200`}>Paid</span>;
            case 'shipped': return <span className={`${baseClasses} bg-blue-800 text-blue-200`}>Shipped</span>;
            case 'delivered': return <span className={`${baseClasses} bg-purple-800 text-purple-200`}>Delivered</span>;
            case 'cancelled': return <span className={`${baseClasses} bg-red-800 text-red-200`}>Cancelled</span>;
            default: return <span className={`${baseClasses} bg-gray-700 text-gray-300`}>Pending</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Orders</h1>

            <div className="bg-gray-800 p-6 rounded-lg">
                {isLoading ? (
                    <p>Loading orders...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900">
                            <tr className="border-b border-gray-600">
                                <th className="p-3">Order ID</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Customer</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {orders.map(order => (
                                <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3 font-mono text-sm">#{order.id}</td>
                                    <td className="p-3">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="p-3">{order.users?.email || 'Guest'}</td>
                                    <td className="p-3">${order.total_amount.toFixed(2)}</td>
                                    <td className="p-3"><OrderStatusBadge status={order.status} /></td>
                                    <td className="p-3">
                                        <button onClick={() => setSelectedOrder(order)} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Order #{selectedOrder.id}</h2>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">&times;</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Order Items</h3>
                                <div className="space-y-2">
                                    {selectedOrder.order_items.map(item => (
                                        <div key={item.product_variants.id} className="flex justify-between items-center text-sm p-2 bg-gray-900/50 rounded">
                                            <div>
                                                <p className="font-medium">{item.product_variants.products.name}</p>
                                                <p className="text-gray-400">{item.product_variants.sku} - {item.product_variants.color} / {item.product_variants.size}</p>
                                            </div>
                                            <p>{item.quantity} x ${item.price_at_purchase.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Shipping Details</h3>
                                {selectedOrder.addresses ? (
                                    <div className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded">
                                        <p>{selectedOrder.addresses.address_line_1}</p>
                                        {selectedOrder.addresses.address_line_2 && <p>{selectedOrder.addresses.address_line_2}</p>}
                                        <p>{selectedOrder.addresses.city}, {selectedOrder.addresses.state_province_region} {selectedOrder.addresses.postal_code}</p>
                                        <p>{selectedOrder.addresses.country}</p>
                                    </div>
                                ) : <p className="text-sm text-gray-500">No address provided (guest checkout).</p>}
                            </div>
                            {/* In a future step, a form to update status and tracking would go here */}
                        </div>
                        <div className="p-4 bg-gray-900/50 text-right">
                            <button onClick={() => setSelectedOrder(null)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}