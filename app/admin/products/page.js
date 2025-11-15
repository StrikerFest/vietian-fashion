// app/admin/products/page.js
'use client';

import { useState, useEffect } from 'react';

// @unchanged (emptyVariant constant remains the same)
const emptyVariant = { sku: '', price: '', size: '', color: '', on_hand: '' };

export default function AdminProductsPage() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [collections, setCollections] = useState([]);
    const [categories, setCategories] = useState([]);

    // --- Form state ---
    const [productName, setProductName] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [variants, setVariants] = useState([{ ...emptyVariant }]);
    const [imageFile, setImageFile] = useState(null);
    const [tags, setTags] = useState([]);
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categoryId, setCategoryId] = useState('');
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);

    // --- NEW: State for bulk import ---
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState({ type: '', text: '' });

    // --- NEW: State for bulk export ---
    const [isExporting, setIsExporting] = useState(false);

    // --- NEW: State for selected products ---
    const [selectedProductIds, setSelectedProductIds] = useState([]);

    // @unchanged (useEffect for fetching initial data)
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [productsRes, categoriesRes, collectionsRes] = await Promise.all([
                    fetch('/api/products'),
                    fetch('/api/categories'),
                    fetch('/api/collections')
                ]);
                if (!productsRes.ok || !categoriesRes.ok || !collectionsRes.ok) {
                    throw new Error('Failed to fetch initial data');
                }
                const productsData = await productsRes.json();
                const categoriesData = await categoriesRes.json();
                const collectionsData = await collectionsRes.json();
                setProducts(productsData || []);
                setCategories(categoriesData || []);
                setCollections(collectionsData || []);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    // @unchanged (resetForm function)
    const resetForm = () => {
        setProductName('');
        setProductDescription('');
        setSeoTitle('');
        setSeoDescription('');
        setVariants([{ ...emptyVariant }]);
        setImageFile(null);
        setTags([]);
        setCategoryId('');
        setSelectedCollectionIds([]);
        setShowForm(false);
        setEditingProduct(null);
    };

    // @unchanged (handleEdit function)
    const handleEdit = (product) => {
        setEditingProduct(product);
        setProductName(product.name);
        setProductDescription(product.description || '');
        setSeoTitle(product.seo_title || ''); //
        setSeoDescription(product.seo_description || ''); //
        const variantsWithInventory = product.product_variants.map(v => ({
            ...v,
            on_hand: v.inventory_levels?.[0]?.on_hand ?? 0
        }));
        setVariants(variantsWithInventory.length > 0 ? variantsWithInventory : [{ ...emptyVariant }]);
        setTags(product.tags ? product.tags.map(t => t.name) : []);
        setCategoryId(product.categories?.[0]?.id || '');
        setSelectedCollectionIds(product.collections ? product.collections.map(c => c.id) : []);
        setShowForm(true);
    };

    // @unchanged (handleCollectionChange function)
    const handleCollectionChange = (collectionId) => {
        setSelectedCollectionIds(prev =>
            prev.includes(collectionId)
                ? prev.filter(id => id !== collectionId)
                : [...prev, collectionId]
        );
    };

    // @unchanged (handleSubmit function)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const isEditing = !!editingProduct;
        const url = isEditing ? `/api/products/${editingProduct.id}` : '/api/products';
        const method = isEditing ? 'PUT' : 'POST';
        //
        const productData = {
            name: productName,
            description: productDescription,
            seo_title: seoTitle || null,
            seo_description: seoDescription || null,
            variants: variants.map(v => ({
                id: v.id,
                sku: v.sku,
                price: parseFloat(v.price) || 0,
                size: v.size,
                color: v.color,
                on_hand: parseInt(v.on_hand, 10) || 0,
            })),
            tags: tags,
            category_id: categoryId || null,
            collection_ids: selectedCollectionIds,
        };
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} product`);
            }
            const productsRes = await fetch('/api/products');
            const productsData = await productsRes.json();
            setProducts(productsData || []);
            resetForm();
            alert(`Product ${isEditing ? 'updated' : 'created'} successfully!`);
        } catch (error) {
            console.error('Submission failed:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- NEW: Handle Bulk Import Submission ---
    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            setImportMessage({ type: 'error', text: 'Please select a CSV file to import.' });
            return;
        }
        setIsImporting(true);
        setImportMessage({ type: '', text: '' });
        const formData = new FormData();
        formData.append('file', importFile);
        try {
            const response = await fetch('/api/products/bulk-import', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Bulk import failed.');
            }
            setImportMessage({ type: 'success', text: `Import successful! ${data.created_products} products created, ${data.created_variants} variants added.` });
            setImportFile(null);
            document.getElementById('importFile').value = null;
            const productsRes = await fetch('/api/products'); //
            const productsData = await productsRes.json();
            setProducts(productsData || []);
        } catch (error) {
            console.error('Import failed:', error);
            setImportMessage({ type: 'error', text: `Error: ${error.message}` });
        } finally {
            setIsImporting(false);
        }
    };


    // --- NEW: Handler for selecting/deselecting a single product ---
    const handleSelectProduct = (productId) => {
        setSelectedProductIds((prevSelected) =>
            prevSelected.includes(productId)
                ? prevSelected.filter((id) => id !== productId) // Deselect
                : [...prevSelected, productId] // Select
        );
    };

    // --- NEW: Handler for selecting/deselecting all products ---
    const handleSelectAllProducts = (e) => {
        if (e.target.checked) {
            // Select all product IDs from the current `products` state
            setSelectedProductIds(products.map((p) => p.id));
        } else {
            // Deselect all
            setSelectedProductIds([]);
        }
    };

    // --- MODIFIED: Handle Bulk Export Click ---
    const handleExport = async (mode = 'all') => {
        if (mode === 'selected' && selectedProductIds.length === 0) {
            alert('Please select products to export.');
            return;
        }

        setIsExporting(true);
        let exportUrl = '/api/products/bulk-export'; //

        if (mode === 'selected') {
            // Append selected IDs as a query parameter
            const params = new URLSearchParams();
            params.append('ids', selectedProductIds.join(','));
            exportUrl = `${exportUrl}?${params.toString()}`;
        }

        try {
            const response = await fetch(exportUrl);
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to export products.');
                } catch (jsonError) {
                    throw new Error(`Failed to export products. Status: ${response.status}`);
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Generate a dynamic filename
            const filename = mode === 'selected'
                ? `products_export_selected_${selectedProductIds.length}.csv`
                : 'products_export_all.csv';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Error exporting products: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    // @unchanged (handleGenerateTags, addTag, removeTag, handleVariantChange, addVariant, removeVariant, handleDelete functions)
    const handleGenerateTags = async () => {
        // ... (implementation remains the same)
        if (!imageFile) {
            alert('Please select an image first.');
            return;
        }
        setIsGeneratingTags(true);
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('name', productName);
        formData.append('description', productDescription);
        try {
            const response = await fetch('/api/generate-tags', { //
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'AI tag generation failed');
            }
            const data = await response.json();
            setTags(prevTags => [...new Set([...prevTags, ...data.tags])]);
        } catch (error) {
            console.error('Error generating tags:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsGeneratingTags(false);
        }
    };
    const addTag = () => {
        // ... (implementation remains the same)
        if (tagInput && !tags.includes(tagInput.toLowerCase())) {
            setTags([...tags, tagInput.toLowerCase().trim()]);
            setTagInput('');
        }
    };
    const removeTag = (tagToRemove) => {
        // ... (implementation remains the same)
        setTags(tags.filter(tag => tag !== tagToRemove));
    }
    const handleVariantChange = (index, field, value) => {
        // ... (implementation remains the same)
        const updatedVariants = [...variants];
        updatedVariants[index] = {...updatedVariants[index], [field]: value};
        if (field === 'on_hand') {
            updatedVariants[index].on_hand = value;
        }
        setVariants(updatedVariants);
    };
    const addVariant = () => {
        // ... (implementation remains the same)
        setVariants([...variants, { ...emptyVariant }]);
    };
    const removeVariant = (index) => {
        // ... (implementation remains the same)
        if (variants.length > 1) setVariants(variants.filter((_, i) => i !== index));
    };
    const handleDelete = async (productId) => {
        // ... (implementation remains the same)
        if (!confirm('Are you sure you want to delete this product and all its variants?')) {
            return;
        }
        try {
            const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete product');
            }
            setProducts(products.filter(p => p.id !== productId));
            alert('Product deleted successfully!');
        } catch (error) {
            alert(`Error deleting product: ${error.message}`);
        }
    };

    // --- NEW: Calculate "Select All" checkbox state ---
    const allVisibleProductsSelected = products.length > 0 && selectedProductIds.length === products.length;


    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Products</h1>

            {/* --- Add Product Button --- */}
            <div className="mb-6">
                <button
                    onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                    {showForm ? 'Cancel' : '+ Add New Product'}
                </button>
            </div>

            {/* --- Add/Edit Product Form (conditionally rendered) --- */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg mt-4 space-y-6">
                    {/* ... form content ... */}
                    <h2 className="text-xl font-semibold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                    {/* Name/Description */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="productName" className="block text-sm font-medium mb-1">Product Name</label>
                            <input id="productName" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" required/>
                        </div>
                        <div>
                            <label htmlFor="productDescription" className="block text-sm font-medium mb-1">Description</label>
                            <textarea id="productDescription" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" rows="3"></textarea>
                        </div>
                    </div>
                    {/* SEO Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="seoTitle" className="block text-sm font-medium mb-1">SEO Title (Optional)</label>
                            <input id="seoTitle" type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Max 60 chars recommended" maxLength="70" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>
                        </div>
                        <div>
                            <label htmlFor="seoDescription" className="block text-sm font-medium mb-1">SEO Meta Description (Optional)</label>
                            <textarea id="seoDescription" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Max 160 chars recommended" maxLength="170" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" rows="3"></textarea>
                        </div>
                    </div>
                    {/* Category */}
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium mb-1">Category</label>
                        <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600">
                            {/* ... options ... */}
                            <option value="">-- Select a Category --</option>
                            {categories.filter(c => !c.parent_id).map(parent => (
                                <optgroup key={parent.id} label={parent.name}>
                                    <option value={parent.id}>{parent.name}</option>
                                    {categories.filter(c => c.parent_id === parent.id).map(child => (
                                        <option key={child.id} value={child.id}>&nbsp;&nbsp;&nbsp;&nbsp;{child.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                            {categories.filter(c => !c.parent_id && !categories.some(child => child.parent_id === c.id) ).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Collections */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Collections</label>
                        <div className="max-h-32 overflow-y-auto bg-gray-900 p-3 rounded-md space-y-2 border border-gray-600">
                            {/* ... checkboxes ... */}
                            {collections.map(collection => (
                                <div key={collection.id} className="flex items-center">
                                    <input id={`collection-${collection.id}`} type="checkbox" checked={selectedCollectionIds.includes(collection.id)} onChange={() => handleCollectionChange(collection.id)} className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"/>
                                    <label htmlFor={`collection-${collection.id}`} className="ml-2 text-sm">{collection.name}</label>
                                </div>
                            ))}
                            {collections.length === 0 && <p className="text-xs text-gray-500">No collections created yet.</p>}
                        </div>
                    </div>
                    {/* Image & Tags */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Product Image & Tags</h3>
                        {/* ... image/tags UI ... */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-gray-900 rounded-md border border-gray-700">
                            {/* ... Image Input ... */}
                            <div className="flex-1 w-full md:w-auto">
                                <label htmlFor="imageUpload" className="block text-sm font-medium mb-1">Upload Image (Optional)</label>
                                <input type="file" id="imageUpload" accept="image/png, image/jpeg, image/webp" onChange={(e) => setImageFile(e.target.files[0])}
                                       className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600 cursor-pointer"/>
                            </div>
                            {/* ... Generate Button ... */}
                            <button type="button" onClick={handleGenerateTags} disabled={!imageFile || isGeneratingTags}
                                    className="self-start md:self-end bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed whitespace-nowrap">
                                {isGeneratingTags ? 'Generating...' : 'Generate Tags with AI'}
                            </button>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium mb-1">Tags</label>
                            {/* ... Tag Input ... */}
                            <div className="flex gap-2 mb-2">
                                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add a tag manually"
                                       className="flex-grow bg-gray-700 p-2 rounded-md border border-gray-600"/>
                                <button type="button" onClick={addTag} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Add</button>
                            </div>
                            {/* ... Display Tags ... */}
                            <div className="flex flex-wrap gap-2 p-2 bg-gray-900 rounded-md min-h-[40px] border border-gray-700">
                                {tags.map(tag => (
                                    <span key={tag} className="flex items-center bg-blue-600 text-white text-sm font-medium pl-3 pr-2 py-1 rounded-full">
                                            {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 text-blue-200 hover:text-white text-xs font-bold">✕</button>
                                        </span>
                                ))}
                                {tags.length === 0 && <span className="text-xs text-gray-500 italic">No tags added.</span>}
                            </div>
                        </div>
                    </div>
                    {/* Variants */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Product Variants</h3>
                        {/* ... variants list ... */}
                        {variants.map((variant, index) => (
                            <div key={variant.id || `new-${index}`} className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3 p-3 bg-gray-900 rounded-md border border-gray-700">
                                <input type="text" placeholder="SKU" value={variant.sku} onChange={(e) => handleVariantChange(index, 'sku', e.target.value)} className="bg-gray-700 p-2 rounded-md border border-gray-600" required/>
                                <input type="number" step="0.01" placeholder="Price" value={variant.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} className="bg-gray-700 p-2 rounded-md border border-gray-600" required/>
                                <input type="text" placeholder="Size" value={variant.size} onChange={(e) => handleVariantChange(index, 'size', e.target.value)} className="bg-gray-700 p-2 rounded-md border border-gray-600" required/>
                                <input type="text" placeholder="Color" value={variant.color} onChange={(e) => handleVariantChange(index, 'color', e.target.value)} className="bg-gray-700 p-2 rounded-md border border-gray-600" required/>
                                <input type="number" placeholder="On Hand Stock" value={variant.on_hand} onChange={(e) => handleVariantChange(index, 'on_hand', e.target.value)} className="bg-gray-700 p-2 rounded-md border border-gray-600" required/>
                                <button type="button" onClick={() => removeVariant(index)} disabled={isSubmitting || variants.length <= 1} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                        {/* ... Add Variant / Save buttons ... */}
                        <button type="button" onClick={addVariant} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500">
                            + Add Variant
                        </button>
                        <button type="submit" disabled={isSubmitting} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500">
                            {isSubmitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Save Product')}
                        </button>
                    </div>
                </form>
            )}

            {/* --- MODIFIED: Bulk Import/Export Section --- */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
                <h2 className="text-xl font-semibold mb-4">Bulk Import & Export</h2>

                {/* --- Import Form --- */}
                <form onSubmit={handleImportSubmit} className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-grow">
                        <label htmlFor="importFile" className="block text-sm font-medium mb-1">Import CSV File</label>
                        <input
                            type="file"
                            id="importFile"
                            accept=".csv, text/csv"
                            onChange={(e) => setImportFile(e.target.files[0])}
                            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 cursor-pointer"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isImporting || !importFile}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isImporting ? 'Importing...' : 'Upload & Import'}
                    </button>
                </form>
                {/* Display Import Success/Error Messages */}
                {importMessage.text && (
                    <p className={`mt-4 text-sm ${importMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                        {importMessage.text}
                    </p>
                )}

                {/* --- MODIFIED: Export Buttons --- */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                    <h3 className="text-lg font-semibold mb-2">Bulk Export</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Download a CSV file of selected products or all products.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button
                            type="button"
                            onClick={() => handleExport('selected')}
                            disabled={isExporting || selectedProductIds.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isExporting ? 'Exporting...' : `Export Selected (${selectedProductIds.length})`}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleExport('all')}
                            disabled={isExporting}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-5 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isExporting ? 'Exporting...' : `Export All (${products.length})`}
                        </button>
                    </div>
                </div>

            </div>

            {/* --- MODIFIED: Existing Products Table --- */}
            <div className="bg-gray-800 p-6 rounded-lg mt-8">
                 <h2 className="text-xl font-semibold mb-4">Existing Products</h2>
                 {isLoading ? (<p>Loading products...</p>) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-auto">
                            <thead className="bg-gray-900">
                            <tr>
                                {/* --- NEW: Select All Checkbox --- */}
                                <th className="p-3 w-4">
                                    <input
                                        type="checkbox"
                                        checked={allVisibleProductsSelected}
                                        onChange={handleSelectAllProducts}
                                        // ref property can be used for indeterminate state if needed
                                        className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                                <th className="p-3 w-1/3">Product Name</th>
                                <th className="p-3">Variants</th>
                                <th className="p-3">Total Stock</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Collections</th>
                                <th className="p-3">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {products.map(product => (
                                <tr key={product.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-sm align-top">
                                    {/* --- NEW: Row Checkbox --- */}
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedProductIds.includes(product.id)}
                                            onChange={() => handleSelectProduct(product.id)}
                                            className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </td>
                                    {/* @unchanged (Rest of the table cells) */}
                                    <td className="p-3 font-medium">{product.name}</td>
                                    <td className="p-3">{product.product_variants?.length || 0}</td>
                                    <td className="p-3">
                                        {product.product_variants?.reduce((sum, v) => sum + (v.inventory_levels?.[0]?.on_hand || 0), 0)}
                                    </td>
                                    <td className="p-3">{product.categories?.[0]?.name || <span className="text-gray-500 italic">None</span>}</td>
                                    <td className="p-3">
                                        {product.collections?.length > 0
                                            ? product.collections.map(c => c.name).join(', ')
                                            : <span className="text-gray-500 italic">None</span>
                                        }
                                    </td>
                                    <td className="p-3 flex gap-2 whitespace-nowrap">
                                        <button onClick={() => handleEdit(product)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                                        <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        { !isLoading && products.length === 0 && <p className="text-gray-500 mt-4 text-center">No products created yet.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}