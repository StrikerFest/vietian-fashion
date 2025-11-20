// components/admin/ProductForm.js
'use client';

import { useState, useEffect } from 'react';

const emptyVariant = { sku: '', price: '', size: '', color: '', on_hand: '' };

export default function ProductForm({
                                        initialData = null,
                                        categories = [],
                                        collections = [],
                                        onSuccess,
                                        onCancel
                                    }) {
    // --- Form State ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [variants, setVariants] = useState([{ ...emptyVariant }]);
    const [imageFile, setImageFile] = useState(null);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);

    // --- UI/Loading State ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [showTagWarning, setShowTagWarning] = useState(false);

    // --- Initialize Form on Edit ---
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            setSeoTitle(initialData.seo_title || '');
            setSeoDescription(initialData.seo_description || '');

            // Transform variants to include on_hand from inventory
            const variantsWithInventory = initialData.product_variants?.map(v => ({
                ...v,
                on_hand: v.inventory_levels?.[0]?.on_hand ?? 0
            })) || [];
            setVariants(variantsWithInventory.length > 0 ? variantsWithInventory : [{ ...emptyVariant }]);

            setTags(initialData.tags ? initialData.tags.map(t => t.name) : []);
            setCategoryId(initialData.categories?.[0]?.id || '');
            setSelectedCollectionIds(initialData.collections ? initialData.collections.map(c => c.id) : []);
        }
    }, [initialData]);

    // --- Handlers ---

    const handleCollectionChange = (collectionId) => {
        setSelectedCollectionIds(prev =>
            prev.includes(collectionId)
                ? prev.filter(id => id !== collectionId)
                : [...prev, collectionId]
        );
    };

    const handleVariantChange = (index, field, value) => {
        const updatedVariants = [...variants];
        updatedVariants[index] = { ...updatedVariants[index], [field]: value };
        setVariants(updatedVariants);
    };

    const addVariant = () => {
        setVariants([...variants, { ...emptyVariant }]);
    };

    const removeVariant = (index) => {
        if (variants.length > 1) {
            setVariants(variants.filter((_, i) => i !== index));
        }
    };

    const addTag = () => {
        if (tagInput && !tags.includes(tagInput.toLowerCase())) {
            setTags([...tags, tagInput.toLowerCase().trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    // --- AI Handlers ---

    const handleGenerateDescription = async () => {
        if (!imageFile) return alert('Please select an image first.');
        if (!name) return alert('Please enter a Product Name first.');

        setIsGeneratingDescription(true);
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('name', name);

        try {
            const response = await fetch('/api/generate-description', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Failed to generate description.');
            const data = await response.json();
            if (data.description) setDescription(data.description);
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleGenerateTagsClick = () => {
        if (!imageFile) return alert('Please select an image first.');
        if (!description || description.length < 20) {
            setShowTagWarning(true);
        } else {
            generateTags();
        }
    };

    const generateTags = async () => {
        setShowTagWarning(false);
        setIsGeneratingTags(true);
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('name', name);
        formData.append('description', description || '');

        try {
            const response = await fetch('/api/generate-tags', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('AI tag generation failed');
            const data = await response.json();
            setTags(prev => [...new Set([...prev, ...data.tags])]);
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsGeneratingTags(false);
        }
    };

    // --- Submit Handler ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const isEditing = !!initialData;
        const url = isEditing ? `/api/products/${initialData.id}` : '/api/products';
        const method = isEditing ? 'PUT' : 'POST';

        const productData = {
            name,
            description,
            seo_title: seoTitle || null,
            seo_description: seoDescription || null,
            variants: variants.map(v => ({
                id: v.id, // Include ID if editing existing variant
                sku: v.sku,
                price: parseFloat(v.price) || 0,
                size: v.size,
                color: v.color,
                on_hand: parseInt(v.on_hand, 10) || 0,
            })),
            tags,
            category_id: categoryId || null,
            collection_ids: selectedCollectionIds,
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Operation failed');
            }

            // Notify parent to refresh
            onSuccess(isEditing ? 'Product updated!' : 'Product created!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg mt-4 mb-8 space-y-6 border border-gray-700">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{initialData ? 'Edit Product' : 'Add New Product'}</h2>
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium mb-1">Product Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
                        required
                    />
                </div>

                {/* Description & AI */}
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <label className="block text-sm font-medium">Description</label>
                        <button
                            type="button"
                            onClick={handleGenerateDescription}
                            disabled={!imageFile || isGeneratingDescription}
                            className="text-xs bg-teal-600 hover:bg-teal-700 text-white py-1 px-2 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {isGeneratingDescription ? 'Writing...' : '✨ Auto-Write with AI'}
                        </button>
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
                        rows="3"
                        placeholder="Enter description manually or upload an image..."
                    ></textarea>
                </div>

                {/* SEO Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">SEO Title</label>
                        <input
                            type="text"
                            value={seoTitle}
                            onChange={(e) => setSeoTitle(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">SEO Description</label>
                        <textarea
                            value={seoDescription}
                            onChange={(e) => setSeoDescription(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
                            rows="3"
                        ></textarea>
                    </div>
                </div>

                {/* Taxonomy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                        >
                            <option value="">-- Select Category --</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Collections</label>
                        <div className="max-h-32 overflow-y-auto bg-gray-900 p-3 rounded-md space-y-2 border border-gray-600">
                            {collections.map(collection => (
                                <div key={collection.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedCollectionIds.includes(collection.id)}
                                        onChange={() => handleCollectionChange(collection.id)}
                                        className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600"
                                    />
                                    <span className="ml-2 text-sm">{collection.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Image & Tags */}
                <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Product Image (for AI generation)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files[0])}
                                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-600 file:text-white cursor-pointer"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleGenerateTagsClick}
                            disabled={!imageFile || isGeneratingTags}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600 whitespace-nowrap self-end"
                        >
                            {isGeneratingTags ? 'Generating...' : '✨ Generate Tags'}
                        </button>
                    </div>

                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                            placeholder="Add tag manually..."
                            className="flex-grow bg-gray-700 p-2 rounded-md border border-gray-600"
                        />
                        <button type="button" onClick={addTag} className="bg-gray-600 px-4 rounded-md">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <span key={tag} className="bg-blue-600 text-white text-sm px-2 py-1 rounded-full flex items-center">
                                {tag}
                                <button type="button" onClick={() => removeTag(tag)} className="ml-1 font-bold">&times;</button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Variants */}
                <div>
                    <h3 className="text-lg font-semibold mb-2">Variants</h3>
                    {variants.map((variant, index) => (
                        <div key={index} className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3 p-3 bg-gray-900 rounded-md border border-gray-700">
                            <input type="text" placeholder="SKU" value={variant.sku} onChange={(e) => handleVariantChange(index, 'sku', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600" required />
                            <input type="number" placeholder="Price" value={variant.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600" required />
                            <input type="text" placeholder="Size" value={variant.size} onChange={(e) => handleVariantChange(index, 'size', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600" />
                            <input type="text" placeholder="Color" value={variant.color} onChange={(e) => handleVariantChange(index, 'color', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600" />
                            <input type="number" placeholder="Stock" value={variant.on_hand} onChange={(e) => handleVariantChange(index, 'on_hand', e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600" required />
                            <button type="button" onClick={() => removeVariant(index)} disabled={variants.length <= 1} className="bg-red-600 text-white rounded px-2 disabled:opacity-50">Remove</button>
                        </div>
                    ))}
                    <button type="button" onClick={addVariant} className="text-sm text-green-400 hover:text-green-300 font-semibold">+ Add Variant</button>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-4 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onCancel} className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-md font-bold">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-md font-bold disabled:bg-gray-600">
                        {isSubmitting ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </form>

            {/* Warning Modal for Tags */}
            {showTagWarning && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 p-6 rounded-lg max-w-md border border-yellow-600">
                        <h3 className="text-xl font-bold text-yellow-500 mb-2">⚠️ Low Detail Warning</h3>
                        <p className="text-gray-300 mb-4">Description is short. AI tags might be generic.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => setShowTagWarning(false)} className="bg-teal-600 py-2 rounded-md">Go Back</button>
                            <button onClick={generateTags} className="bg-gray-600 py-2 rounded-md">Proceed Anyway</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}