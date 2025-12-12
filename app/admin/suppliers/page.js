// app/admin/suppliers/page.js
'use client';

import { useState, useEffect } from 'react';
import SupplierForm from '@/components/admin/SupplierForm';
import SupplierList from '@/components/admin/SupplierList';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function SuppliersPage() {
    const { addToast } = useToast(); // --- NEW ---
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingSupplier, setEditingSupplier] = useState(null);

    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/suppliers');
            if (!response.ok) throw new Error('Failed to fetch suppliers');
            const data = await response.json();
            setSuppliers(data || []);
        } catch (error) {
            console.error("Failed to fetch suppliers:", error);
            addToast("Không thể tải danh sách nhà cung cấp.", 'error'); // Fallback for fetch error
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleDelete = async (supplierId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này không?')) return;
        try {
            const response = await fetch(`/api/suppliers/${supplierId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete supplier');

            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
            addToast('Nhà cung cấp đã được lưu trữ thành công!', 'success'); // --- FIXED: Replaced alert() ---
        } catch (error) {
            addToast(error.message, 'error'); // --- FIXED: Replaced alert() ---
        }
    };

    const handleFormSuccess = (message) => {
        addToast(message, 'success'); // --- FIXED: Replaced alert() ---
        setEditingSupplier(null);
        fetchSuppliers();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Quản lý Nhà cung cấp</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="md:col-span-1">
                    <SupplierForm
                        initialData={editingSupplier}
                        onSuccess={handleFormSuccess}
                        onCancel={() => setEditingSupplier(null)}
                    />
                </div>

                {/* Right Column: List */}
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">Danh sách Nhà cung cấp</h2>
                    {isLoading ? (
                        <p className="text-gray-400 text-center">Đang tải nhà cung cấp...</p>
                    ) : (
                        <SupplierList
                            suppliers={suppliers}
                            onEdit={setEditingSupplier}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}