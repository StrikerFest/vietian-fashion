// app/admin/inventory/page.js
'use client';

import { useState, useEffect } from 'react';
import InventoryAdjustForm from '@/components/admin/InventoryAdjustForm';
import InventoryLogList from '@/components/admin/InventoryLogList';

export default function InventoryPage() {
    const [logs, setLogs] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [logsRes, productsRes] = await Promise.all([
                fetch('/api/admin/inventory/logs'),
                fetch('/api/products')
            ]);
            setLogs(await logsRes.json() || []);
            setProducts(await productsRes.json() || []);
        } catch (error) {
            console.error("Failed to fetch inventory data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdjust = async (data) => {
        const response = await fetch('/api/admin/inventory/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Adjustment failed');
        }

        alert('Inventory updated successfully.');
        fetchData(); // Refresh logs and products (to update on-hand display)
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Inventory Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Adjustment Form */}
                <div className="lg:col-span-1">
                    <InventoryAdjustForm products={products} onAdjust={handleAdjust} />
                </div>

                {/* Right: Audit Log */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Audit Log</h2>
                        {isLoading ? <p className="text-center text-gray-400">Loading...</p> : <InventoryLogList logs={logs} />}
                    </div>
                </div>
            </div>
        </div>
    );
}