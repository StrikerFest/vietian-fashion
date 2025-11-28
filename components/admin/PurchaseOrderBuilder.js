// components/admin/PurchaseOrderBuilder.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function PurchaseOrderBuilder({ suppliers, products, onSubmit }) {
    const router = useRouter();
    const { addToast } = useToast(); // --- NEW ---

    const [supplierId, setSupplierId] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [items, setItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [qty, setQty] = useState(1);
    const [cost, setCost] = useState(0);
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

    // --- NEW: Dynamic Label Helper ---
    const getVariantLabel = (v) => {
        let details = '';
        if (v.attributes && Object.keys(v.attributes).length > 0) {
            details = Object.values(v.attributes).join(' / ');
        }
        return `${v.sku}${details ? ` - ${details}` : ''}`;
    };

    const addItem = () => {
        if (!selectedProductId || !selectedVariantId || qty <= 0) {
            addToast('Please select a product, variant, and quantity.', 'info');
            return;
        }

        const product = products.find(p => p.id == selectedProductId);
        const variant = variantsMap[selectedProductId].find(v => v.id == selectedVariantId);

        if (items.find(i => i.variant_id === variant.id)) {
            addToast('This variant is already in the order.', 'info'); // --- FIXED: Replaced alert() ---
            return;
        }

        setItems([...items, {
            variant_id: variant.id,
            quantity: parseInt(qty),
            cost_price: parseFloat(cost),
            productName: product.name,
            sku: variant.sku,
            // Use the helper to generate string details for the list view
            details: getVariantLabel(variant).replace(variant.sku, '').replace(' - ', '')
        }]);
        setQty(1);
        setCost(0);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!supplierId) {
            addToast('Please select a supplier.', 'error'); // --- FIXED: Replaced alert() ---
            return;
        }
        if (items.length === 0) {
            addToast('Please add items to the order.', 'error'); // --- FIXED: Replaced alert() ---
            return;
        }

        setIsSubmitting(true);
        await onSubmit({ supplierId, expectedDate, items });
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6 border border-gray-700">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Supplier</label>
                    <select
                        value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 text-white"
                        required
                    >
                        <option value="">-- Select Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Expected Date</label>
                    <input
                        type="date"
                        value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-white">Order Items</h2>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6 bg-gray-900/50 p-4 rounded-md">
                    <div className="md:col-span-4">
                        <label className="block text-xs font-medium mb-1 text-gray-400">Product</label>
                        <select
                            value={selectedProductId} onChange={handleProductChange}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm text-white"
                        >
                            <option value="">-- Select --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium mb-1 text-gray-400">Variant</label>
                        <select
                            value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm disabled:opacity-50 text-white"
                            disabled={!selectedProductId}
                        >
                            {variantsMap[selectedProductId]?.map(v => (
                                <option key={v.id} value={v.id}>
                                    {getVariantLabel(v)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-1 text-gray-400">Qty</label>
                        <input
                            type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm text-white"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-1 text-gray-400">Cost</label>
                        <input
                            type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm text-white"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <button type="button" onClick={addItem} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-md text-sm">
                            +
                        </button>
                    </div>
                </div>

                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900 text-gray-400">
                    <tr>
                        <th className="p-2">Product</th>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Unit Cost</th>
                        <th className="p-2">Total</th>
                        <th className="p-2"></th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="p-2 text-white">{item.productName}</td>
                            <td className="p-2">{item.sku} <span className="text-gray-500">({item.details})</span></td>
                            <td className="p-2">{item.quantity}</td>
                            <td className="p-2">${item.cost_price.toFixed(2)}</td>
                            <td className="p-2">${(item.quantity * item.cost_price).toFixed(2)}</td>
                            <td className="p-2 text-right">
                                <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 font-bold">&times;</button>
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-gray-500">No items added.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end gap-4">
                <button type="button" onClick={() => router.back()} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-600">
                    {isSubmitting ? 'Saving...' : 'Save Order'}
                </button>
            </div>
        </form>
    );
}