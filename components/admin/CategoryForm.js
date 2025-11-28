// components/admin/CategoryForm.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function CategoryForm({ initialData, categories, onSuccess, onCancel }) {
    const { addToast } = useToast(); // --- NEW ---
    // Basic Fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState('');

    // Unified Taxonomy Fields
    const [type, setType] = useState('catalog'); // 'catalog' or 'attribute'
    const [displayStyle, setDisplayStyle] = useState('list'); // 'list', 'swatch', 'pill'
    const [value, setValue] = useState(''); // Hex code or meta value
    const [isActive, setIsActive] = useState(true);
    const [sortOrder, setSortOrder] = useState(0);

    // Time Fencing
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // SEO
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('general'); // 'general', 'settings', 'seo'

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            setParentId(initialData.parent_id || '');

            setType(initialData.type || 'catalog');
            setDisplayStyle(initialData.display_style || 'list');
            setValue(initialData.value || '');
            setIsActive(initialData.is_active ?? true);
            setSortOrder(initialData.sort_order || 0);

            setStartDate(initialData.start_date ? new Date(initialData.start_date).toISOString().slice(0, 16) : '');
            setEndDate(initialData.end_date ? new Date(initialData.end_date).toISOString().slice(0, 16) : '');

            setSeoTitle(initialData.seo_title || '');
            setSeoDescription(initialData.seo_description || '');
        }
    }, [initialData]);

    // Filter parents based on selected type (Catalog shouldn't be a child of an Attribute)
    const eligibleParents = useMemo(() => {
        return categories.filter(c =>
            c.type === type && // Only same type
            c.id !== initialData?.id // Prevent self-parenting
        );
    }, [categories, type, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const url = initialData ? `/api/categories/${initialData.id}` : '/api/categories';
        const method = initialData ? 'PUT' : 'POST';

        const body = {
            name,
            description,
            parent_id: parentId || null,
            type,
            display_style: displayStyle,
            value: value || null,
            is_active: isActive,
            sort_order: parseInt(sortOrder),
            start_date: startDate ? new Date(startDate).toISOString() : null,
            end_date: endDate ? new Date(endDate).toISOString() : null,
            seo_title: seoTitle || null,
            seo_description: seoDescription || null,
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Operation failed');
            }

            onSuccess(initialData ? 'Category updated!' : 'Category created!');
        } catch (error) {
            addToast(error.message, 'error'); // --- FIXED: Replaced alert() ---
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-gray-700 sticky top-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{initialData ? 'Edit Category' : 'Add New Category'}</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700 mb-6">
                {['general', 'settings', 'seo'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                            activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* --- Tab: General --- */}
                {activeTab === 'general' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white"
                                rows="3"
                            ></textarea>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => { setType(e.target.value); setParentId(''); }}
                                    className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white"
                                >
                                    <option value="catalog">Catalog (Navigation)</option>
                                    <option value="attribute">Attribute (Filter)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Parent</label>
                                <select
                                    value={parentId}
                                    onChange={(e) => setParentId(e.target.value)}
                                    className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white"
                                >
                                    <option value="">-- Root (Top Level) --</option>
                                    {eligibleParents.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                )}

                {/* --- Tab: Settings (Control) --- */}
                {activeTab === 'settings' && (
                    <>
                        <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700">
                            <label className="text-sm font-medium text-gray-300">Is Active?</label>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="h-5 w-5 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-xs text-gray-500">{isActive ? 'Visible' : 'Hidden'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Sort Order</label>
                                <input
                                    type="number"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white"
                                    placeholder="0 (First)"
                                />
                            </div>

                            {/* Show Style options only for Attributes */}
                            {type === 'attribute' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-300">Display Style</label>
                                    <select
                                        value={displayStyle}
                                        onChange={(e) => setDisplayStyle(e.target.value)}
                                        className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white"
                                    >
                                        <option value="list">List (Checkbox)</option>
                                        <option value="pill">Pill (Button)</option>
                                        <option value="swatch">Swatch (Color)</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="opacity-50">
                                    <label className="block text-sm font-medium mb-1 text-gray-500">Display Style</label>
                                    <input disabled value="N/A" className="w-full bg-gray-800 p-2 rounded border border-gray-700 text-gray-500" />
                                </div>
                            )}
                        </div>

                        {/* Show Value input only if relevant (e.g. Color Swatch) */}
                        {type === 'attribute' && displayStyle === 'swatch' && (
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Swatch Color (Hex)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={value || '#000000'}
                                        onChange={(e) => setValue(e.target.value)}
                                        className="h-10 w-14 p-1 bg-gray-700 border border-gray-600 rounded"
                                    />
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        className="flex-grow bg-gray-700 p-2 rounded border border-gray-600 text-white"
                                        placeholder="#FFFFFF"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-gray-700 mt-2">
                            <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Schedule Visibility (Optional)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs mb-1 text-gray-500">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1 text-gray-500">End Date</label>
                                    <input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        min={startDate || ''}
                                        className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* --- Tab: SEO --- */}
                {activeTab === 'seo' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">SEO Title</label>
                            <input
                                type="text"
                                value={seoTitle}
                                onChange={(e) => setSeoTitle(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white"
                                placeholder="Title tag..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">Meta Description</label>
                            <textarea
                                value={seoDescription}
                                onChange={(e) => setSeoDescription(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white"
                                rows="3"
                                placeholder="Meta description..."
                            ></textarea>
                        </div>
                    </>
                )}

                {/* Footer Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-700 mt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-600"
                    >
                        {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
                    </button>
                </div>
            </form>
        </div>
    );
}