// app/admin/purchase-orders/create/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PurchaseOrderBuilder from '@/components/admin/PurchaseOrderBuilder';
import { useToast } from '@/context/ToastContext';

export default function CreatePurchaseOrderPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [supRes, prodRes] = await Promise.all([
                    fetch('/api/suppliers'),
                    fetch('/api/products?limit=1000') // [FIX] Fetch all products for dropdown
                ]);
                
                const suppliersData = await supRes.json();
                setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);

                const productsData = await prodRes.json();
                // Check if it's paginated { data: [] } or just []
                setProducts(Array.isArray(productsData) ? productsData : (productsData.data || []));
            } catch (error) {
                console.error("Failed to load data", error);
                addToast("Không thể tải dữ liệu cần thiết để tạo đơn hàng.", 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (orderData) => {
        try {
            const res = await fetch('/api/admin/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplier_id: orderData.supplierId,
                    expected_date: orderData.expectedDate,
                    items: orderData.items
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create order');
            }

            addToast('Tạo đơn nhập hàng thành công!', 'success');
            router.push('/admin/purchase-orders');
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    if (isLoading) return <div className="min-h-screen bg-gray-900 text-white p-8 flex justify-center">Đang tải...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Tạo Đơn Nhập Hàng</h1>
            <PurchaseOrderBuilder
                suppliers={suppliers}
                products={products}
                onSubmit={handleSubmit}
            />
        </div>
    );
}