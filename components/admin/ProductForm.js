// components/admin/ProductForm.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const emptyVariant = { sku: '', price: '', on_hand: '', attribute_value_ids: {} }; // Map of GroupID -> OptionID

export default function ProductForm({ initialData, categories = [], collections = [], onSuccess, onCancel }) {
    const supabase = createClientComponentClient();

    // ... [Basic Fields State - Same as before] ...
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [position, setPosition] = useState(0);
    const [selectedCatalogId, setSelectedCatalogId] = useState('');
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedAttributeIds, setSelectedAttributeIds] = useState(new Set());
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');

    // Variants State
    const [variantConfig, setVariantConfig] = useState([]); // Active Group IDs
    const [variants, setVariants] = useState([{ ...emptyVariant }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Organize Attributes
    const attributeGroups = useMemo(() => {
        const groups = {};
        categories.filter(c => c.type === 'attribute' && !c.parent_id).forEach(root => {
            groups[root.id] = { ...root, options: [] };
        });
        categories.filter(c => c.type === 'attribute' && c.parent_id).forEach(opt => {
            if (groups[opt.parent_id]) {
                groups[opt.parent_id].options.push(opt);
            }
        });
        return Object.values(groups);
    }, [categories]);

    // Load Data
    useEffect(() => {
        if (initialData) {
            // ... [Basic Fields Loading - Same as before] ...
            setName(initialData.name);
            setDescription(initialData.description || '');
            setCurrentImageUrl(initialData.image_url || '');
            setPosition(initialData.position || 0);
            setSeoTitle(initialData.seo_title || '');
            setSeoDescription(initialData.seo_description || '');
            if (initialData.catalog_categories?.[0]) setSelectedCatalogId(initialData.catalog_categories[0].id);
            if (initialData.attributes) setSelectedAttributeIds(new Set(initialData.attributes.map(a => a.id)));
            if (initialData.collections) setSelectedCollectionIds(initialData.collections.map(c => c.id));

            // Load Variants
            if (initialData.product_variants?.length > 0) {
                const loadedVariants = initialData.product_variants.map(v => {
                    // Convert array of IDs back to Map for the UI inputs
                    const attrMap = {};
                    if (v.attribute_value_ids) {
                        v.attribute_value_ids.forEach(optId => {
                            // Find which group this option belongs to
                            const group = attributeGroups.find(g => g.options.some(o => o.id === optId));
                            if (group) attrMap[group.id] = optId;
                        });
                    }

                    return {
                        ...v,
                        on_hand: v.inventory_levels?.[0]?.on_hand ?? 0,
                        attribute_value_ids: attrMap
                    };
                });
                setVariants(loadedVariants);

                // Detect Config from first variant
                const detectedConfig = new Set();
                const firstVar = loadedVariants[0];
                Object.keys(firstVar.attribute_value_ids).forEach(groupId => {
                    detectedConfig.add(parseInt(groupId));
                });
                setVariantConfig(Array.from(detectedConfig));
            }
        }
    }, [initialData, attributeGroups]);

    // ... [Handlers for Taxonomy - Same as before] ...
    const handleAttributeToggle = (id) => { const next = new Set(selectedAttributeIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedAttributeIds(next); };
    const handleCollectionToggle = (id) => { setSelectedCollectionIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]); };
    const handleVariantConfigToggle = (groupId) => { setVariantConfig(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]); };
    const handleVariantChange = (index, field, value) => { const updated = [...variants]; updated[index][field] = value; setVariants(updated); };
    const addVariant = () => setVariants([...variants, { ...emptyVariant }]);
    const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));

    // New Handler for Attribute IDs
    const handleVariantAttributeChange = (index, groupId, optionId) => {
        const updated = [...variants];
        updated[index].attribute_value_ids = {
            ...updated[index].attribute_value_ids,
            [groupId]: parseInt(optionId)
        };
        setVariants(updated);
    };

    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error } = await supabase.storage.from('products').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let finalImageUrl = currentImageUrl;
            if (imageFile) finalImageUrl = await uploadImage(imageFile);

            const processedVariants = variants.map(v => {
                // Flatten map values to array for API: [10, 20]
                const attrIds = Object.values(v.attribute_value_ids).filter(id => id);

                // Legacy fallback logic
                let legacyColor = null;
                let legacySize = null;

                // Try to map selected IDs back to names for legacy columns
                Object.entries(v.attribute_value_ids).forEach(([groupId, optId]) => {
                    const group = attributeGroups.find(g => g.id === parseInt(groupId));
                    const option = group?.options.find(o => o.id === optId);
                    if (group?.name === 'Color') legacyColor = option?.name;
                    if (group?.name === 'Size') legacySize = option?.name;
                });

                return {
                    ...v,
                    price: parseFloat(v.price),
                    on_hand: parseInt(v.on_hand),
                    attribute_value_ids: attrIds,
                    size: legacySize || v.size,
                    color: legacyColor || v.color
                };
            });

            const body = {
                name,
                description,
                image_url: finalImageUrl,
                seo_title: seoTitle,
                seo_description: seoDescription,
                position: parseInt(position),
                variants: processedVariants,
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

    // ... [Render Logic mostly same, just updated the table loop] ...
    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            {/* ... Basic Info & Taxonomy Inputs (Hidden for brevity, same as before) ... */}
            <h2 className="text-xl font-bold mb-6">{initialData ? 'Edit Product' : 'New Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-8">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div><label className="block text-sm text-gray-400 mb-1">Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white" required /></div>
                        <div><label className="block text-sm text-gray-400 mb-1">Position</label><input type="number" value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white" /></div>
                        <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white" rows="4" /></div>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                        <label className="block text-sm text-gray-400 mb-2">Product Image</label><input type="file" onChange={e => setImageFile(e.target.files[0])} className="w-full text-sm" />{currentImageUrl && <img src={currentImageUrl} alt="Preview" className="mt-2 h-32 object-cover rounded" />}
                    </div>
                </div>

                {/* Taxonomy Grids (Same as before) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-700 pt-6">
                    <div>
                        <h3 className="font-semibold mb-2 text-blue-400">Navigation</h3>
                        <select value={selectedCatalogId} onChange={e => setSelectedCatalogId(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white">
                            <option value="">-- Select --</option>{categories.filter(c => c.type === 'catalog').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-green-400">Collections</h3>
                        <div className="max-h-40 overflow-y-auto bg-gray-700 p-2 rounded border border-gray-600">{collections.map(c => <label key={c.id} className="flex gap-2 p-1"><input type="checkbox" checked={selectedCollectionIds.includes(c.id)} onChange={() => handleCollectionToggle(c.id)} /><span className="text-sm">{c.name}</span></label>)}</div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-purple-400">Search Tags</h3>
                        <div className="max-h-40 overflow-y-auto bg-gray-700 p-2 rounded border border-gray-600">{attributeGroups.map(g => <div key={g.id}><p className="text-xs text-gray-500 font-bold">{g.name}</p>{g.options.map(o => <label key={o.id} className="flex gap-2 pl-2"><input type="checkbox" checked={selectedAttributeIds.has(o.id)} onChange={() => handleAttributeToggle(o.id)} /><span className="text-sm">{o.name}</span></label>)}</div>)}</div>
                    </div>
                </div>

                {/* Variant Config */}
                <div className="border-t border-gray-700 pt-6 mt-6">
                    <div className="bg-indigo-900/20 p-4 rounded border border-indigo-500/30 mb-6">
                        <p className="text-sm text-indigo-300 mb-2 font-bold">Variant Definitions</p>
                        <div className="flex flex-wrap gap-4">
                            {attributeGroups.map(group => (
                                <label key={group.id} className="flex items-center gap-2 cursor-pointer bg-gray-800 px-3 py-1.5 rounded border border-gray-600 hover:border-indigo-500">
                                    <input type="checkbox" checked={variantConfig.includes(group.id)} onChange={() => handleVariantConfigToggle(group.id)} className="text-indigo-500" />
                                    <span className="text-white text-sm">{group.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {variants.map((variant, index) => (
                            <div key={index} className="flex flex-wrap gap-3 items-end bg-gray-900 p-3 rounded border border-gray-700">
                                <div className="w-32"><label className="text-xs text-gray-500">SKU</label><input type="text" value={variant.sku} onChange={e => handleVariantChange(index, 'sku', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" required /></div>

                                {/* Dynamic Dropdowns */}
                                {variantConfig.map(groupId => {
                                    const group = attributeGroups.find(g => g.id === groupId);
                                    return (
                                        <div key={groupId} className="w-32">
                                            <label className="text-xs text-gray-500">{group?.name}</label>
                                            <select
                                                value={variant.attribute_value_ids[groupId] || ''}
                                                onChange={(e) => handleVariantAttributeChange(index, groupId, e.target.value)}
                                                className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm"
                                                required
                                            >
                                                <option value="">- Select -</option>
                                                {group?.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                            </select>
                                        </div>
                                    );
                                })}

                                <div className="w-24"><label className="text-xs text-gray-500">Price</label><input type="number" value={variant.price} onChange={e => handleVariantChange(index, 'price', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" required /></div>
                                <div className="w-20"><label className="text-xs text-gray-500">Stock</label><input type="number" value={variant.on_hand} onChange={e => handleVariantChange(index, 'on_hand', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" required /></div>
                                <button type="button" onClick={() => removeVariant(index)} disabled={variants.length <= 1} className="bg-red-600 text-white rounded px-2 h-9 self-end mb-0.5">×</button>
                            </div>
                        ))}
                        <button type="button" onClick={addVariant} className="text-sm text-green-400 font-bold">+ Add Variant</button>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                    <button type="button" onClick={onCancel} className="px-6 py-2 rounded bg-gray-600 text-white font-bold">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded bg-indigo-600 text-white font-bold disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Product'}</button>
                </div>
            </form>
        </div>
    );
}