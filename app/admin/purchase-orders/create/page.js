// app/admin/purchase-orders/create/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatePurchaseOrderPage() {
    const router = useRouter();

    // Data State
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]); // All products to pick from
    const [variantsMap, setVariantsMap] = useState({}); // Map product_id to variants

    // Form State
    const [supplierId, setSupplierId] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [items, setItems] = useState([]); // { variant_id, quantity, cost_price, productName, sku }
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Selection State (for adding new line items)
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [qty, setQty] = useState(1);
    const [cost, setCost] = useState(0);

    // 1. Fetch Suppliers and Products on Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [supRes, prodRes] = await Promise.all([
                    fetch('/api/suppliers'),
                    fetch('/api/products')
                ]);
                const supData = await supRes.json();
                const prodData = await prodRes.json();

                setSuppliers(supData || []);
                setProducts(prodData || []);

                // Pre-process variants for easier lookup
                const vMap = {};
                (prodData || []).forEach(p => {
                    vMap[p.id] = p.product_variants || [];
                });
                setVariantsMap(vMap);

            } catch (error) {
                console.error("Failed to load initial data", error);
            }
        };
        fetchData();
    }, []);

    // Helper to handle product selection change
    const handleProductChange = (e) => {
        const pid = e.target.value;
        setSelectedProductId(pid);
        setSelectedVariantId(''); // Reset variant
        // Default to first variant if exists
        if (pid && variantsMap[pid]?.length > 0) {
            setSelectedVariantId(variantsMap[pid][0].id);
        }
    };

    // Add Item to List
    const addItem = () => {
        if (!selectedProductId || !selectedVariantId || qty <= 0) return;

        const product = products.find(p => p.id == selectedProductId);
        const variant = variantsMap[selectedProductId].find(v => v.id == selectedVariantId);

        // Prevent duplicates
        if (items.find(i => i.variant_id === variant.id)) {
            alert('This variant is already in the order.');
            return;
        }

        const newItem = {
            variant_id: variant.id,
            quantity: parseInt(qty),
            cost_price: parseFloat(cost),
            productName: product.name,
            sku: variant.sku,
            details: `${variant.color} / ${variant.size}`
        };

        setItems([...items, newItem]);
        // Reset selection inputs
        setQty(1);
        setCost(0);
    };

    const removeItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    // Submit Order
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!supplierId) { alert('Please select a supplier'); return; }
        if (items.length === 0) { alert('Please add at least one item'); return; }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplier_id: supplierId,
                    expected_date: expectedDate,
                    items: items
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create order');
            }

            router.push('/admin/purchase-orders');

        } catch (error) {
            alert(error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Create Purchase Order</h1>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Step 1: Order Details */}
                <div className="bg-gray-800 p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Supplier</label>
                        <select
                            value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                            required
                        >
                            <option value="">-- Select Supplier --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Expected Date</label>
                        <input
                            type="date"
                            value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-gray-300"
                        />
                    </div>
                </div>

                {/* Step 2: Add Items */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Add Products</h2>

                    {/* Item Entry Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6 bg-gray-700/30 p-4 rounded-md">
                        <div className="md:col-span-4">
                            <label className="block text-xs font-medium mb-1 text-gray-400">Product</label>
                            <select
                                value={selectedProductId} onChange={handleProductChange}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                            >
                                <option value="">-- Select Product --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium mb-1 text-gray-400">Variant</label>
                            <select
                                value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                                disabled={!selectedProductId}
                            >
                                {variantsMap[selectedProductId]?.map(v => (
                                    <option key={v.id} value={v.id}>{v.sku} - {v.color} / {v.size}</option>
                                ))}
                                {!selectedProductId && <option>Select product first</option>}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-1 text-gray-400">Quantity</label>
                            <input
                                type="number" min="1"
                                value={qty} onChange={(e) => setQty(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-1 text-gray-400">Cost Price (Per Unit)</label>
                            <input
                                type="number" min="0" step="0.01"
                                value={cost} onChange={(e) => setCost(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <button
                                type="button" onClick={addItem}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-md text-sm"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900 text-gray-400">
                        <tr>
                            <th className="p-2">Product</th>
                            <th className="p-2">SKU / Variant</th>
                            <th className="p-2">Qty</th>
                            <th className="p-2">Unit Cost</th>
                            <th className="p-2">Total</th>
                            <th className="p-2"></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="p-2">{item.productName}</td>
                                <td className="p-2">{item.sku} <span className="text-gray-500">({item.details})</span></td>
                                <td className="p-2">{item.quantity}</td>
                                <td className="p-2">${item.cost_price.toFixed(2)}</td>
                                <td className="p-2">${(item.quantity * item.cost_price).toFixed(2)}</td>
                                <td className="p-2 text-right">
                                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300">Remove</button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr><td colSpan="6" className="p-4 text-center text-gray-500">No items added yet.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        type="button" onClick={() => router.back()}
                        className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-500"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Order'}
                    </button>
                </div>
            </form>
        </div>
    );
}