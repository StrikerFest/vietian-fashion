// app/admin/purchase-orders/create/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PurchaseOrderBuilder from '@/components/admin/PurchaseOrderBuilder';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function CreatePurchaseOrderPage() {
    const router = useRouter();
    const { addToast } = useToast(); // --- NEW ---
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [supRes, prodRes] = await Promise.all([
                    fetch('/api/suppliers'),
                    fetch('/api/products')
                ]);
                setSuppliers(await supRes.json() || []);
                setProducts(await prodRes.json() || []);
            } catch (error) {
                console.error("Failed to load data", error);
                addToast("Failed to load necessary data for PO creation.", 'error');
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

            addToast('Purchase Order created successfully!', 'success'); // --- NEW ---
            router.push('/admin/purchase-orders');
        } catch (error) {
            addToast(error.message, 'error'); // --- FIXED: Replaced alert() ---
        }
    };

    if (isLoading) return <div className="min-h-screen bg-gray-900 text-white p-8 flex justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Create Purchase Order</h1>
            <PurchaseOrderBuilder
                suppliers={suppliers}
                products={products}
                onSubmit={handleSubmit}
            />
        </div>
    );
}