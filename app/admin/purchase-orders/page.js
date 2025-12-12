// app/admin/purchase-orders/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PurchaseOrderList from '@/components/admin/PurchaseOrderList';
import { useToast } from '@/context/ToastContext';

export default function PurchaseOrdersPage() {
    const { addToast } = useToast();
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
            addToast("Không thể tải danh sách đơn nhập hàng.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        if (newStatus === 'received' && !confirm("Đánh dấu là 'Đã nhận' sẽ cập nhật tồn kho. Tiếp tục?")) return;
        try {
            const res = await fetch(`/api/admin/purchase-orders/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status: newStatus })
            });
            if(!res.ok) throw new Error('Cập nhật trạng thái thất bại');
            fetchOrders();
            addToast(`Đơn nhập hàng #${id} đã được đánh dấu là ${newStatus}!`, 'success');
        } catch (e) {
            addToast(e.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if(!confirm("Xóa đơn hàng này?")) return;
        try {
            const res = await fetch(`/api/admin/purchase-orders/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Xóa thất bại');
            setOrders(prev => prev.filter(o => o.id !== id));
            addToast(`Đơn nhập hàng #${id} đã được lưu trữ.`, 'success');
        } catch (e) {
            addToast(e.message, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Đơn Nhập Hàng</h1>
                <Link href="/admin/purchase-orders/create" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    + Tạo Đơn Nhập Hàng
                </Link>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                {isLoading ? (
                    <p className="text-gray-400 text-center">Đang tải đơn hàng...</p>
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