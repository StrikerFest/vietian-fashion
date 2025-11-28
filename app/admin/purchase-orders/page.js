// app/admin/purchase-orders/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PurchaseOrderList from '@/components/admin/PurchaseOrderList';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function PurchaseOrdersPage() {
    const { addToast } = useToast(); // --- NEW ---
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/purchase-orders');
            const data = await response.json();
            setOrders(data || []);
        } catch (error) {
            console.error(error);
            addToast("Failed to load purchase orders.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        if (newStatus === 'received' && !confirm("Marking as 'Received' will update inventory. Continue?")) return;
        try {
            const res = await fetch(`/api/admin/purchase-orders/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status: newStatus })
            });
            if(!res.ok) throw new Error('Failed to update status');
            fetchOrders();
            addToast(`Purchase Order #${id} marked as ${newStatus}!`, 'success'); // --- FIXED: Replaced alert() ---
        } catch (e) {
            addToast(e.message, 'error'); // --- FIXED: Replaced alert() ---
        }
    };

    const handleDelete = async (id) => {
        if(!confirm("Delete this order?")) return;
        try {
            const res = await fetch(`/api/admin/purchase-orders/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setOrders(prev => prev.filter(o => o.id !== id));
            addToast(`Purchase Order #${id} archived.`, 'success'); // --- FIXED: Replaced alert() ---
        } catch (e) {
            addToast(e.message, 'error'); // --- FIXED: Replaced alert() ---
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Purchase Orders</h1>
                <Link href="/admin/purchase-orders/create" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    + Create Purchase Order
                </Link>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                {isLoading ? (
                    <p className="text-gray-400 text-center">Loading orders...</p>
                ) : (
                    <PurchaseOrderList
                        orders={orders}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                    />
                )}
            </div>
        </div>
    );
}