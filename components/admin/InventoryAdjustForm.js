// components/admin/InventoryAdjustForm.js
'use client';

import { useState, useEffect } from 'react';

export default function InventoryAdjustForm({ products, onAdjust }) {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [adjustmentQty, setAdjustmentQty] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [variantsMap, setVariantsMap] = useState({});

    useEffect(() => {
        const vMap = {};
        (products || []).forEach(p => {
            vMap[p.id] = p.product_variants || [];
        });
        setVariantsMap(vMap);
    }, [products]);

    const handleProductChange = (e) => {
        const pid = e.target.value;
        setSelectedProductId(pid);
        setSelectedVariantId('');
        if (pid && variantsMap[pid]?.length > 0) {
            setSelectedVariantId(variantsMap[pid][0].id);
        }
    };

    // Helper to generate a label for the dropdown
    const getVariantLabel = (v) => {
        let details = '';
        if (v.attributes && Object.keys(v.attributes).length > 0) {
            details = Object.values(v.attributes).join(' / ');
        } else {
            // Legacy fallback
            details = `${v.color || ''} ${v.size || ''}`.trim();
        }

        return `${v.sku} - ${details} (Stock: ${v.inventory_levels?.[0]?.on_hand ?? 0})`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedVariantId || !adjustmentQty || !reason) return alert('Fill all fields.');
        if (parseInt(adjustmentQty) === 0) return alert('Quantity cannot be 0.');

        if (!confirm(`Adjust stock by ${adjustmentQty}?`)) return;

        setIsSubmitting(true);
        try {
            await onAdjust({ variant_id: selectedVariantId, quantity_change: adjustmentQty, reason });
            setAdjustmentQty('');
            setReason('');
        } catch(e) {
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 sticky top-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Manual Adjustment</h2>
            <p className="text-sm text-gray-400 mb-4">Correct stock counts or account for damage.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Product</label>
                    <select value={selectedProductId} onChange={handleProductChange} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-sm text-white">
                        <option value="">-- Select Product --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Variant</label>
                    <select
                        value={selectedVariantId}
                        onChange={(e) => setSelectedVariantId(e.target.value)}
                        disabled={!selectedProductId}
                        className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-sm text-white disabled:opacity-50"
                    >
                        {variantsMap[selectedProductId]?.map(v => (
                            <option key={v.id} value={v.id}>
                                {getVariantLabel(v)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Quantity Change</label>
                    <input type="number" placeholder="+5 or -2" value={adjustmentQty} onChange={(e) => setAdjustmentQty(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-sm text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Reason</label>
                    <input type="text" placeholder="e.g. Damaged" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-sm text-white" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:bg-gray-600">
                    {isSubmitting ? 'Updating...' : 'Update Stock'}
                </button>
            </form>
        </div>
    );
}