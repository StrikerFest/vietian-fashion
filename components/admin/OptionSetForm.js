// components/admin/OptionSetForm.js
'use client';

import { useState, useEffect } from 'react';

// --- HELPER: Single Condition Row ---
function ConditionRow({ condition, onChange, onRemove, products, collections, categories }) {
    return (
        <div className="flex flex-wrap gap-2 items-center bg-gray-800 p-2 rounded border border-gray-600">
            <span className="text-xs font-bold text-indigo-300 mr-1">IF</span>
            <select
                value={condition.type}
                onChange={(e) => onChange('type', e.target.value)}
                className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600"
            >
                <option value="all">Always Apply</option>
                <option value="product">Product Is</option>
                <option value="collection">In Collection</option>
                <option value="category">In Category</option>
                <option value="price">Price Is</option>
            </select>

            {/* Dynamic Inputs */}
            {condition.type === 'product' && (
                <select
                    value={condition.value}
                    onChange={(e) => onChange('value', e.target.value)}
                    className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600 flex-grow"
                >
                    <option value="">-- Select Product --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            )}

            {condition.type === 'collection' && (
                <select
                    value={condition.value}
                    onChange={(e) => onChange('value', e.target.value)}
                    className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600 flex-grow"
                >
                    <option value="">-- Select Collection --</option>
                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            )}

            {condition.type === 'category' && (
                <select
                    value={condition.value}
                    onChange={(e) => onChange('value', e.target.value)}
                    className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600 flex-grow"
                >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            )}

            {condition.type === 'price' && (
                <>
                    <select
                        value={condition.operator || 'gt'}
                        onChange={(e) => onChange('operator', e.target.value)}
                        className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600"
                    >
                        <option value="gt">Greater Than</option>
                        <option value="lt">Less Than</option>
                        <option value="eq">Equals</option>
                    </select>
                    <input
                        type="number"
                        value={condition.value}
                        onChange={(e) => onChange('value', e.target.value)}
                        className="bg-gray-700 text-white rounded p-1 text-sm border border-gray-600 w-24"
                        placeholder="Price"
                    />
                </>
            )}

            <button type="button" onClick={onRemove} className="text-gray-500 hover:text-red-400 px-2 ml-auto font-bold text-lg">×</button>
        </div>
    );
}

// --- HELPER: Advanced Rule Builder (Groups) ---
function AdvancedRuleBuilder({ groups, onChange, meta }) {
    const addGroup = () => onChange([...groups, { conditions: [{ type: 'all', value: '' }] }]);

    const removeGroup = (index) => onChange(groups.filter((_, i) => i !== index));

    const updateGroup = (groupIndex, newConditions) => {
        const updated = [...groups];
        updated[groupIndex].conditions = newConditions;
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {groups.map((group, gIdx) => (
                <div key={gIdx} className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 relative">
                    {gIdx > 0 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-700 px-2 py-0.5 rounded text-xs font-bold text-white uppercase border border-gray-500">
                            OR
                        </div>
                    )}
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Condition Group {gIdx + 1} (Match ALL)</h4>
                        <button type="button" onClick={() => removeGroup(gIdx)} className="text-red-400 text-xs hover:underline">Remove Group</button>
                    </div>

                    <div className="space-y-2 pl-2 border-l-2 border-indigo-500/30">
                        {group.conditions.map((cond, cIdx) => (
                            <ConditionRow
                                key={cIdx}
                                condition={cond}
                                products={meta.products}
                                collections={meta.collections}
                                categories={meta.categories}
                                onChange={(field, val) => {
                                    const newConds = [...group.conditions];
                                    newConds[cIdx][field] = val;
                                    // Reset value if type changes
                                    if (field === 'type') newConds[cIdx].value = '';
                                    updateGroup(gIdx, newConds);
                                }}
                                onRemove={() => {
                                    const newConds = group.conditions.filter((_, i) => i !== cIdx);
                                    updateGroup(gIdx, newConds);
                                }}
                            />
                        ))}
                        <button
                            type="button"
                            onClick={() => updateGroup(gIdx, [...group.conditions, { type: 'category', value: '' }])}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-2 flex items-center gap-1"
                        >
                            + AND another condition
                        </button>
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addGroup}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 border-dashed rounded-lg text-gray-300 text-sm font-bold transition-colors"
            >
                + Add New Rule Group (OR)
            </button>
        </div>
    );
}

// --- HELPER: Option Builder (Unchanged from previous, included for completeness) ---
function OptionBuilder({ options, onChange }) {
    const addOption = () => onChange([...options, { type: 'text', label: 'New Option', is_required: false, values: [], price_modifier: 0 }]);
    const updateOption = (idx, field, val) => { const u = [...options]; u[idx][field] = val; onChange(u); };
    const removeOption = (idx) => onChange(options.filter((_, i) => i !== idx));
    const updateValues = (idx, vals) => updateOption(idx, 'values', vals);

    return (
        <div className="space-y-6">
            {options.map((opt, idx) => (
                <div key={idx} className="bg-gray-900/50 p-4 rounded border border-gray-600 relative group">
                    <button type="button" onClick={() => removeOption(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Label</label>
                            <input type="text" value={opt.label} onChange={(e) => updateOption(idx, 'label', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white" />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Type</label>
                            <select value={opt.type} onChange={(e) => updateOption(idx, 'type', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white">
                                <option value="text">Text Input</option>
                                <option value="textarea">Text Area</option>
                                <option value="select">Dropdown (Select)</option> {/* FIX 5 */}
                                <option value="radio">Radio Buttons</option>
                                <option value="checkbox_button">Checkbox List</option>
                            </select>
                        </div>

                        {/* FIX 3: Base Price Input */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Base Price (+$)</label>
                            <input
                                type="number" min="0" step="0.01"
                                value={opt.price_modifier || 0}
                                onChange={(e) => updateOption(idx, 'price_modifier', parseFloat(e.target.value))}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center mb-4">
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" checked={opt.is_required} onChange={(e) => updateOption(idx, 'is_required', e.target.checked)} className="h-4 w-4 bg-gray-800 border-gray-600 rounded text-indigo-500" />
                            <span className="ml-2 text-sm text-gray-300">Required Field</span>
                        </label>
                    </div>

                    {/* Show choices builder for select, radio, checkbox */}
                    {['select', 'radio', 'checkbox_button'].includes(opt.type) && (
                        <div className="bg-gray-800 p-3 rounded border border-gray-700">
                            <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Choices</p>
                            {opt.values.map((val, vIdx) => (
                                <div key={vIdx} className="flex gap-2 mb-2">
                                    <input placeholder="Label" value={val.label} onChange={(e) => { const n = [...opt.values]; n[vIdx].label = e.target.value; updateValues(idx, n); }} className="flex-grow bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                                    <input type="number" placeholder="$ Mod" value={val.price_modifier} onChange={(e) => { const n = [...opt.values]; n[vIdx].price_modifier = parseFloat(e.target.value) || 0; updateValues(idx, n); }} className="w-24 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                                    <button type="button" onClick={() => updateValues(idx, opt.values.filter((_, i) => i !== vIdx))} className="text-red-500 px-2">×</button>
                                </div>
                            ))}
                            <button type="button" onClick={() => updateValues(idx, [...opt.values, { label: '', price_modifier: 0 }])} className="text-xs text-indigo-400 underline">+ Add Choice</button>
                        </div>
                    )}
                </div>
            ))}
            <button type="button" onClick={addOption} className="w-full py-2 bg-gray-700 hover:bg-gray-600 border border-gray-500 border-dashed rounded text-gray-300 text-sm font-bold">+ Add Option Field</button>
        </div>
    );
}
export default function OptionSetForm({ initialData, onSuccess, onCancel }) {
    const [formData, setFormData] = useState({
        title: '',
        priority: 0,
        is_active: true,
        rules: [], // New structure: Array of Groups { conditions: [] }
        options: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [meta, setMeta] = useState({ products: [], collections: [], categories: [] });

    useEffect(() => {
        const fetchMeta = async () => {
            const [p, c, cat] = await Promise.all([
                fetch('/api/products').then(r => r.json()),
                fetch('/api/collections').then(r => r.json()),
                fetch('/api/categories').then(r => r.json())
            ]);
            setMeta({ products: p.data || [], collections: c.data || [], categories: cat || [] });
        };
        fetchMeta();

        if (initialData) {
            // Data Migration: If existing rules are flat (legacy), wrap them in a single group
            let rules = initialData.rules || [];
            if (rules.length > 0 && !rules[0].conditions) {
                // Legacy format found: [{type: 'all'}, {type: 'product'}] -> implied OR
                // Convert to: [{conditions: [{type:'all'}]}, {conditions: [{type:'product'}]}]
                rules = rules.map(r => ({ conditions: [r] }));
            }

            setFormData({
                title: initialData.title,
                priority: initialData.priority,
                is_active: initialData.is_active,
                rules: rules,
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
                    <label className="block text-sm text-gray-400 mb-1">Set Title</label>
                    <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="e.g. Custom Engraving" />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Priority (Higher first)</label>
                    <input type="number" value={formData.priority} onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" />
                </div>
            </div>

            <div className="flex items-center mb-6">
                <input type="checkbox" id="active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-600" />
                <label htmlFor="active" className="ml-2 text-sm text-gray-300">Enable this option set</label>
            </div>

            <hr className="border-gray-700 my-6" />

            <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-2">Assignment Rules</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Use groups to combine logic. Conditions <strong>inside a group</strong> are ANDed together. Separate groups are ORed.
                </p>
                <AdvancedRuleBuilder
                    groups={formData.rules}
                    onChange={newRules => setFormData({ ...formData, rules: newRules })}
                    meta={meta}
                />
            </div>

            <hr className="border-gray-700 my-6" />

            <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-2">Option Fields</h3>
                <OptionBuilder options={formData.options} onChange={newOptions => setFormData({ ...formData, options: newOptions })} />
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