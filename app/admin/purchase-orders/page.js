// app/admin/purchase-orders/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/purchase-orders');
            const data = await response.json();
            setOrders(data || []);
        } catch (error) {
            console.error("Failed to fetch POs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Helper for status colors
    const getStatusColor = (status) => {
        switch(status) {
            case 'draft': return 'bg-gray-600 text-gray-200';
            case 'ordered': return 'bg-blue-600 text-blue-200';
            case 'received': return 'bg-green-600 text-green-200';
            case 'cancelled': return 'bg-red-600 text-red-200';
            default: return 'bg-gray-600';
        }
    };

    const handleDelete = async (id) => {
        if(!confirm("Are you sure you want to delete this order?")) return;
        try {
            const res = await fetch(`/api/admin/purchase-orders/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            setOrders(orders.filter(o => o.id !== id));
        } catch (e) {
            alert(e.message);
        }
    };

    // Handle Status Change (e.g., Receive)
    const handleStatusChange = async (id, newStatus) => {
        if (newStatus === 'received' && !confirm("Marking as 'Received' will permanently add stock to inventory. Continue?")) return;

        try {
            const res = await fetch(`/api/admin/purchase-orders/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status: newStatus })
            });
            if(!res.ok) throw new Error('Failed to update status');
            fetchOrders(); // Refresh to show new state
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Purchase Orders</h1>
                <Link href="/admin/purchase-orders/create" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                    + Create Purchase Order
                </Link>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
                {isLoading ? <p>Loading...</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900">
                            <tr>
                                <th className="p-3">PO #</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Supplier</th>
                                <th className="p-3">Exp. Date</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {orders.map(po => (
                                <tr key={po.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-sm">
                                    <td className="p-3 font-mono">#{po.id}</td>
                                    <td className="p-3">{new Date(po.created_at).toLocaleDateString()}</td>
                                    <td className="p-3">{po.suppliers?.name}</td>
                                    <td className="p-3">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '-'}</td>
                                    <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(po.status)}`}>
                                                {po.status}
                                            </span>
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        {po.status === 'draft' && (
                                            <button onClick={() => handleStatusChange(po.id, 'ordered')} className="text-blue-400 hover:text-blue-300 font-semibold">Mark Ordered</button>
                                        )}
                                        {po.status === 'ordered' && (
                                            <button onClick={() => handleStatusChange(po.id, 'received')} className="text-green-400 hover:text-green-300 font-semibold">Receive Stock</button>
                                        )}
                                        {po.status !== 'received' && (
                                            <button onClick={() => handleDelete(po.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                                        )}
                                        {po.status === 'received' && <span className="text-gray-500 italic">Completed</span>}
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-gray-500">No purchase orders found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}