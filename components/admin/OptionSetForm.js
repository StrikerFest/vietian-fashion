'use client';

import { useState, useEffect } from 'react';

// --- HELPER COMPONENT: Rule Builder ---
function RuleBuilder({ rules, onChange, products, collections, categories }) {
    const addRule = () => onChange([...rules, { type: 'all', value: '', operator: 'eq' }]);

    const updateRule = (index, field, val) => {
        const updated = [...rules];
        updated[index][field] = val;
        // Reset value if type changes
        if (field === 'type') updated[index].value = '';
        onChange(updated);
    };

    const removeRule = (index) => onChange(rules.filter((_, i) => i !== index));

    return (
        <div className="space-y-3">
            {rules.map((rule, idx) => (
                <div key={idx} className="flex flex-wrap gap-2 items-center bg-gray-900 p-2 rounded border border-gray-700">
                    <select
                        value={rule.type}
                        onChange={(e) => updateRule(idx, 'type', e.target.value)}
                        className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600"
                    >
                        <option value="all">All Products</option>
                        <option value="product">Specific Product</option>
                        <option value="collection">Collection</option>
                        <option value="category">Category</option>
                        <option value="price">Price Condition</option>
                    </select>

                    {/* Dynamic Input based on Type */}
                    {rule.type === 'product' && (
                        <select
                            value={rule.value}
                            onChange={(e) => updateRule(idx, 'value', e.target.value)}
                            className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600 flex-grow"
                        >
                            <option value="">-- Select Product --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}

                    {rule.type === 'collection' && (
                        <select
                            value={rule.value}
                            onChange={(e) => updateRule(idx, 'value', e.target.value)}
                            className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600 flex-grow"
                        >
                            <option value="">-- Select Collection --</option>
                            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}

                    {rule.type === 'category' && (
                        <select
                            value={rule.value}
                            onChange={(e) => updateRule(idx, 'value', e.target.value)}
                            className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600 flex-grow"
                        >
                            <option value="">-- Select Category --</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}

                    {rule.type === 'price' && (
                        <>
                            <select
                                value={rule.operator || 'gt'}
                                onChange={(e) => updateRule(idx, 'operator', e.target.value)}
                                className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600"
                            >
                                <option value="gt">Greater Than</option>
                                <option value="lt">Less Than</option>
                            </select>
                            <input
                                type="number"
                                value={rule.value}
                                onChange={(e) => updateRule(idx, 'value', e.target.value)}
                                className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600 w-24"
                                placeholder="Price"
                            />
                        </>
                    )}

                    <button type="button" onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-300 px-2 font-bold">×</button>
                </div>
            ))}
            <button type="button" onClick={addRule} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-white">+ Add Rule</button>
        </div>
    );
}

// --- HELPER COMPONENT: Option Builder ---
function OptionBuilder({ options, onChange }) {
    const addOption = () => onChange([...options, { type: 'text', label: 'New Option', is_required: false, values: [] }]);

    const updateOption = (index, field, val) => {
        const updated = [...options];
        updated[index][field] = val;
        onChange(updated);
    };

    const removeOption = (index) => onChange(options.filter((_, i) => i !== index));

    // Logic to manage choices (checkbox/radio values)
    const updateValues = (optIndex, newValues) => updateOption(optIndex, 'values', newValues);

    return (
        <div className="space-y-6">
            {options.map((opt, idx) => (
                <div key={idx} className="bg-gray-900/50 p-4 rounded border border-gray-600 relative">
                    <button type="button" onClick={() => removeOption(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-300">Remove Option</button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Label</label>
                            <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => updateOption(idx, 'label', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Type</label>
                            <select
                                value={opt.type}
                                onChange={(e) => updateOption(idx, 'type', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white"
                            >
                                <option value="text">Text Input</option>
                                <option value="textarea">Text Area</option>
                                <option value="checkbox_button">Button/Checkbox List</option>
                                <option value="radio">Radio Buttons</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-5">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={opt.is_required}
                                    onChange={(e) => updateOption(idx, 'is_required', e.target.checked)}
                                    className="h-4 w-4 bg-gray-800 border-gray-600 rounded text-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-300">Required Field</span>
                            </label>
                        </div>
                    </div>

                    {/* Values Builder (Only for selection types) */}
                    {(opt.type === 'checkbox_button' || opt.type === 'radio') && (
                        <div className="bg-gray-800 p-3 rounded border border-gray-700">
                            <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Choices</p>
                            {opt.values.map((val, vIdx) => (
                                <div key={vIdx} className="flex gap-2 mb-2">
                                    <input
                                        placeholder="Label (e.g. Red)"
                                        value={val.label}
                                        onChange={(e) => {
                                            const newVals = [...opt.values];
                                            newVals[vIdx].label = e.target.value;
                                            updateValues(idx, newVals);
                                        }}
                                        className="w-1/2 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Price Mod ($)"
                                        value={val.price_modifier}
                                        onChange={(e) => {
                                            const newVals = [...opt.values];
                                            newVals[vIdx].price_modifier = parseFloat(e.target.value) || 0;
                                            updateValues(idx, newVals);
                                        }}
                                        className="w-24 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => updateValues(idx, opt.values.filter((_, i) => i !== vIdx))}
                                        className="text-red-500 px-2"
                                    >×</button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => updateValues(idx, [...opt.values, { label: '', price_modifier: 0 }])}
                                className="text-xs text-indigo-400 underline"
                            >+ Add Choice</button>
                        </div>
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={addOption}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 border border-gray-500 border-dashed rounded text-gray-300 text-sm font-bold"
            >
                + Add New Field
            </button>
        </div>
    );
}

// --- MAIN FORM COMPONENT ---
export default function OptionSetForm({ initialData, onSuccess, onCancel }) {
    const [formData, setFormData] = useState({
        title: '',
        priority: 0,
        is_active: true,
        rules: [],
        options: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data for Selects
    const [meta, setMeta] = useState({ products: [], collections: [], categories: [] });

    useEffect(() => {
        const fetchMeta = async () => {
            const [p, c, cat] = await Promise.all([
                fetch('/api/products').then(r => r.json()),
                fetch('/api/collections').then(r => r.json()),
                fetch('/api/categories').then(r => r.json())
            ]);
            setMeta({
                products: p.data || [],
                collections: c.data || [],
                categories: cat || []
            });
        };
        fetchMeta();

        if (initialData) {
            setFormData({
                title: initialData.title,
                priority: initialData.priority,
                is_active: initialData.is_active,
                rules: initialData.rules || [],
                options: initialData.product_options || []
            });
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const url = initialData ? `/api/admin/option-sets/${initialData.id}` : '/api/admin/option-sets';
        const method = initialData ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error('Failed to save');
            onSuccess(initialData ? 'Option Set updated' : 'Option Set created');
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Option Set' : 'Create Option Set'}</h2>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Set Title (Internal Name)</label>
                    <input
                        required
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                        placeholder="e.g. T-Shirt Customization"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Priority (Higher first)</label>
                    <input
                        type="number"
                        value={formData.priority}
                        onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                    />
                </div>
            </div>

            <div className="flex items-center mb-6">
                <input
                    type="checkbox"
                    id="active"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-600"
                />
                <label htmlFor="active" className="ml-2 text-sm text-gray-300">Enable this option set</label>
            </div>

            <hr className="border-gray-700 my-6" />

            {/* Rules Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-2">Assignment Rules</h3>
                <p className="text-sm text-gray-400 mb-4">Where should these options appear? If multiple rules are added, the set appears if <strong>ANY</strong> rule matches.</p>
                <RuleBuilder
                    rules={formData.rules}
                    onChange={newRules => setFormData({...formData, rules: newRules})}
                    products={meta.products}
                    collections={meta.collections}
                    categories={meta.categories}
                />
            </div>

            <hr className="border-gray-700 my-6" />

            {/* Options Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-2">Option Fields</h3>
                <p className="text-sm text-gray-400 mb-4">Define the input fields shown to the customer.</p>
                <OptionBuilder
                    options={formData.options}
                    onChange={newOptions => setFormData({...formData, options: newOptions})}
                />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save Option Set'}
                </button>
            </div>
        </form>
    );
}