// components/admin/ProductForm.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const emptyVariant = { sku: '', price: '', size: '', color: '', on_hand: '' };

export default function ProductForm({ initialData, categories = [], collections = [], onSuccess, onCancel }) {
    const supabase = createClientComponentClient();

    // Basic Fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState('');

    // Taxonomy
    const [selectedCatalogId, setSelectedCatalogId] = useState(''); // Main Menu Category
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedAttributeIds, setSelectedAttributeIds] = useState(new Set()); // Set of IDs for Filters

    // Variants & SEO
    const [variants, setVariants] = useState([{ ...emptyVariant }]);
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // --- 1. Organize Attributes for the UI ---
    // We group "Attribute" categories by their parent (e.g. "Color" -> "Red", "Blue")
    const attributeGroups = useMemo(() => {
        const groups = {};
        // Find roots (Color, Material)
        categories.filter(c => c.type === 'attribute' && !c.parent_id).forEach(root => {
            groups[root.id] = { ...root, options: [] };
        });
        // Find options (Red, Cotton) and add to roots
        categories.filter(c => c.type === 'attribute' && c.parent_id).forEach(opt => {
            if (groups[opt.parent_id]) {
                groups[opt.parent_id].options.push(opt);
            }
        });
        return Object.values(groups);
    }, [categories]);

    // --- 2. Load Initial Data ---
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            setCurrentImageUrl(initialData.image_url || '');
            setSeoTitle(initialData.seo_title || '');
            setSeoDescription(initialData.seo_description || '');

            // Load Variants
            const variantsWithInventory = initialData.product_variants?.map(v => ({
                ...v,
                on_hand: v.inventory_levels?.[0]?.on_hand ?? 0
            })) || [];
            setVariants(variantsWithInventory.length > 0 ? variantsWithInventory : [{ ...emptyVariant }]);

            // Load Selected Categories
            // Separate the unified list back into Catalog vs Attributes
            if (initialData.catalog_categories?.[0]) {
                setSelectedCatalogId(initialData.catalog_categories[0].id);
            }

            if (initialData.attributes) {
                const attrIds = new Set(initialData.attributes.map(a => a.id));
                setSelectedAttributeIds(attrIds);
            }

            if (initialData.collections) {
                setSelectedCollectionIds(initialData.collections.map(c => c.id));
            }
        }
    }, [initialData]);

    // --- 3. Handlers ---
    const handleAttributeToggle = (id) => {
        const next = new Set(selectedAttributeIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedAttributeIds(next);
    };

    const handleCollectionToggle = (id) => {
        setSelectedCollectionIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleVariantChange = (index, field, value) => {
        const updated = [...variants];
        updated[index][field] = value;
        setVariants(updated);
    };

    const addVariant = () => setVariants([...variants, { ...emptyVariant }]);
    const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));

    // --- 4. AI Auto-Categorization Handler ---
    const handleGenerateAttributes = async () => {
        if (!imageFile && !currentImageUrl) return alert('Please upload an image first.');
        setIsGeneratingAI(true);

        try {
            const formData = new FormData();
            if (imageFile) formData.append('image', imageFile);
            formData.append('name', name);
            formData.append('description', description);

            // Call our updated API
            const res = await fetch('/api/generate-tags', { method: 'POST', body: formData });
            const { data } = await res.json(); // Expects { "Color": ["Blue"], "Material": ["Cotton"] }

            if (!data) throw new Error("No data returned");

            // Match AI text results to Database IDs
            const newSelectedIds = new Set(selectedAttributeIds);
            let matchCount = 0;

            Object.entries(data).forEach(([groupName, values]) => {
                // 1. Find the group in our DB (e.g. "Color")
                const group = attributeGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
                if (group) {
                    values.forEach(val => {
                        // 2. Find the option in that group (e.g. "Blue")
                        // Note: This is a fuzzy match. You might want to add logic to create if missing.
                        const option = group.options.find(opt => opt.name.toLowerCase().includes(val.toLowerCase()));
                        if (option) {
                            newSelectedIds.add(option.id);
                            matchCount++;
                        }
                    });
                }
            });

            setSelectedAttributeIds(newSelectedIds);
            alert(`AI matched ${matchCount} attributes automatically!`);

        } catch (error) {
            console.error(error);
            alert('AI generation failed. Try manually selecting attributes.');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // --- 5. Upload Logic ---
    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error } = await supabase.storage.from('products').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        return data.publicUrl;
    };

    // --- 6. Submit Logic ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let finalImageUrl = currentImageUrl;
            if (imageFile) finalImageUrl = await uploadImage(imageFile);

            const body = {
                name,
                description,
                image_url: finalImageUrl,
                seo_title: seoTitle,
                seo_description: seoDescription,
                variants: variants.map(v => ({
                    ...v,
                    price: parseFloat(v.price),
                    on_hand: parseInt(v.on_hand)
                })),
                // IDs to link
                category_id: selectedCatalogId || null,
                attribute_ids: Array.from(selectedAttributeIds),
                collection_ids: selectedCollectionIds
            };

            const url = initialData ? `/api/products/${initialData.id}` : '/api/products';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Failed to save product');
            onSuccess();

        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-6">{initialData ? 'Edit Product' : 'New Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white" required />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white" rows="4" />
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                        <label className="block text-sm text-gray-400 mb-2">Product Image</label>
                        <input type="file" onChange={e => setImageFile(e.target.files[0])} className="w-full text-sm" />
                        {currentImageUrl && <img src={currentImageUrl} alt="Preview" className="mt-2 h-32 object-cover rounded" />}

                        {/* AI Button */}
                        <button
                            type="button"
                            onClick={handleGenerateAttributes}
                            disabled={isGeneratingAI || (!imageFile && !currentImageUrl)}
                            className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                            {isGeneratingAI ? 'Analyzing...' : '✨ Auto-Categorize with AI'}
                        </button>
                    </div>
                </div>

                {/* Taxonomy Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-700 pt-6">

                    {/* 1. Catalog (Single Select) */}
                    <div>
                        <h3 className="font-semibold mb-2 text-blue-400">Navigation</h3>
                        <select value={selectedCatalogId} onChange={e => setSelectedCatalogId(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white">
                            <option value="">-- Select Menu Category --</option>
                            {categories.filter(c => c.type === 'catalog').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Collections (Multi Select) */}
                    <div>
                        <h3 className="font-semibold mb-2 text-green-400">Collections</h3>
                        <div className="max-h-40 overflow-y-auto bg-gray-700 p-2 rounded border border-gray-600">
                            {collections.map(c => (
                                <label key={c.id} className="flex items-center gap-2 p-1 hover:bg-gray-600 rounded cursor-pointer">
                                    <input type="checkbox" checked={selectedCollectionIds.includes(c.id)} onChange={() => handleCollectionToggle(c.id)} className="h-4 w-4 bg-gray-700 rounded text-indigo-600" />
                                    <span className="text-sm text-white">{c.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 3. Attributes (Grouped Multi Select) */}
                    <div>
                        <h3 className="font-semibold mb-2 text-purple-400">Attributes (Filters)</h3>
                        <div className="max-h-60 overflow-y-auto bg-gray-700 p-2 rounded border border-gray-600 space-y-3">
                            {attributeGroups.map(group => (
                                <div key={group.id}>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">{group.name}</p>
                                    <div className="pl-2 space-y-1">
                                        {group.options.map(opt => (
                                            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAttributeIds.has(opt.id)}
                                                    onChange={() => handleAttributeToggle(opt.id)}
                                                    className="rounded text-purple-500 focus:ring-purple-500"
                                                />
                                                <span className="text-sm text-white">{opt.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Variants */}
                <div>
                    <h3 className="text-lg font-semibold mb-2">Variants</h3>
                    {variants.map((variant, index) => (
                        <div key={index} className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3 p-3 bg-gray-900 rounded-md border border-gray-700">
                            <input type="text" placeholder="SKU" value={variant.sku} onChange={(e) => handleVariantChange(index, 'sku', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600 text-white" required />
                            <input type="number" placeholder="Price" value={variant.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600 text-white" required />
                            <input type="text" placeholder="Size" value={variant.size} onChange={(e) => handleVariantChange(index, 'size', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600 text-white" />
                            <input type="text" placeholder="Color" value={variant.color} onChange={(e) => handleVariantChange(index, 'color', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600 text-white" />
                            <input type="number" placeholder="Stock" value={variant.on_hand} onChange={(e) => handleVariantChange(index, 'on_hand', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600 text-white" required />
                            <button type="button" onClick={() => removeVariant(index)} disabled={variants.length <= 1} className="bg-red-600 text-white rounded px-2 disabled:opacity-50">Remove</button>
                        </div>
                    ))}
                    <button type="button" onClick={addVariant} className="text-sm text-green-400 hover:text-green-300 font-semibold">+ Add Variant</button>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                    <button type="button" onClick={onCancel} className="px-6 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white font-bold">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50">
                        {isSubmitting ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </form>
        </div>
    );
}