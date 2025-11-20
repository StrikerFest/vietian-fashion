// app/admin/inventory/page.js
'use client';

import { useState, useEffect } from 'react';

export default function InventoryPage() {
    // Data State
    const [logs, setLogs] = useState([]);
    const [products, setProducts] = useState([]);
    const [variantsMap, setVariantsMap] = useState({}); // Map product_id -> variants
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [adjustmentQty, setAdjustmentQty] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [logsRes, productsRes] = await Promise.all([
                fetch('/api/admin/inventory/logs'),
                fetch('/api/products') // We reuse the public products API for simplicity
            ]);

            const logsData = await logsRes.json();
            const productsData = await productsRes.json();

            setLogs(logsData || []);
            setProducts(productsData || []);

            // Build variants map
            const vMap = {};
            (productsData || []).forEach(p => {
                vMap[p.id] = p.product_variants || [];
            });
            setVariantsMap(vMap);

        } catch (error) {
            console.error("Failed to fetch inventory data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle Product Selection
    const handleProductChange = (e) => {
        const pid = e.target.value;
        setSelectedProductId(pid);
        setSelectedVariantId('');
        // Default to first variant if available
        if (pid && variantsMap[pid]?.length > 0) {
            setSelectedVariantId(variantsMap[pid][0].id);
        }
    };

    // Handle Adjustment Submit
    const handleAdjustSubmit = async (e) => {
        e.preventDefault();
        if (!selectedVariantId || !adjustmentQty || !reason) {
            alert('Please fill in all fields.');
            return;
        }

        // Validate quantity is non-zero
        const qty = parseInt(adjustmentQty);
        if (isNaN(qty) || qty === 0) {
            alert('Quantity change cannot be zero.');
            return;
        }

        if (!confirm(`Are you sure you want to adjust stock by ${qty > 0 ? '+' : ''}${qty}?`)) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/admin/inventory/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    variant_id: selectedVariantId,
                    quantity_change: qty,
                    reason: reason
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Adjustment failed');
            }

            // Success
            alert('Inventory updated successfully.');
            setAdjustmentQty('');
            setReason('');
            // Refresh logs
            fetchData();

        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Inventory Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Manual Adjustment Form */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-800 p-6 rounded-lg sticky top-6">
                        <h2 className="text-xl font-semibold mb-4">Manual Adjustment</h2>
                        <p className="text-sm text-gray-400 mb-4">Use this to correct stock counts, account for damage, or add initial stock without a PO.</p>

                        <form onSubmit={handleAdjustSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Product</label>
                                <select
                                    value={selectedProductId}
                                    onChange={handleProductChange}
                                    className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                                >
                                    <option value="">-- Select Product --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Variant</label>
                                <select
                                    value={selectedVariantId}
                                    onChange={(e) => setSelectedVariantId(e.target.value)}
                                    disabled={!selectedProductId}
                                    className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm disabled:opacity-50"
                                >
                                    {variantsMap[selectedProductId]?.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.sku} - {v.color} / {v.size} (Stock: {v.inventory_levels?.[0]?.on_hand ?? 0})
                                        </option>
                                    ))}
                                    {!selectedProductId && <option>Select product first</option>}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity Change</label>
                                <input
                                    type="number"
                                    placeholder="e.g., 5 or -2"
                                    value={adjustmentQty}
                                    onChange={(e) => setAdjustmentQty(e.target.value)}
                                    className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Positive to add, negative to remove.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Reason</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Stock count correction"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md disabled:bg-gray-600"
                            >
                                {isSubmitting ? 'Updating...' : 'Update Stock'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Audit Log Table */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4">Audit Log</h2>
                        {isLoading ? (
                            <p className="text-gray-400">Loading history...</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900 text-gray-300">
                                    <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">User</th>
                                        <th className="p-3">Product / SKU</th>
                                        <th className="p-3 text-right">Change</th>
                                        <th className="p-3">Reason</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-700/30">
                                            <td className="p-3 text-gray-400 whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="p-3">
                                                {log.users ? `${log.users.first_name || ''} ${log.users.last_name || ''}`.trim() || log.users.email : 'System/Guest'}
                                            </td>
                                            <td className="p-3">
                                                <p className="font-medium">{log.product_variants?.products?.name}</p>
                                                <p className="text-xs text-gray-500">{log.product_variants?.sku}</p>
                                            </td>
                                            <td className={`p-3 text-right font-bold ${log.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                                            </td>
                                            <td className="p-3 text-gray-300">{log.reason}</td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-4 text-center text-gray-500">No history found.</td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}