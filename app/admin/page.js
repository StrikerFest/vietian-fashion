// app/admin/page.js
'use client';

import { useState, useEffect } from 'react';

const emptyVariant = { sku: '', price: '', size: '', color: '', on_hand: '' };

export default function AdminPage() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [productName, setProductName] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [variants, setVariants] = useState([{ ...emptyVariant }]);
    const [imageFile, setImageFile] = useState(null);
    const [tags, setTags] = useState([]);
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/products');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setProducts(data || []);
            } catch (error) {
                console.error("Failed to fetch products:", error);
            }
            setIsLoading(false);
        };
        fetchProducts();
    }, []);

    const resetForm = () => {
        setProductName('');
        setProductDescription('');
        setVariants([{ ...emptyVariant }]);
        setImageFile(null);
        setTags([]);
        setShowForm(false);
        setEditingProduct(null);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setProductName(product.name);
        setProductDescription(product.description || '');

        // Correctly map variants and their on_hand quantity from the nested inventory_levels
        const variantsWithInventory = product.product_variants.map(v => ({
            ...v,
            on_hand: v.inventory_levels?.on_hand ?? 0 // Use ?? for robust fallback
        }));

        setVariants(variantsWithInventory.length > 0 ? variantsWithInventory : [{ ...emptyVariant }]);
        setTags(product.tags ? product.tags.map(t => t.name) : []);
        setShowForm(true);
    };

    const handleDelete = async (productId) => {
        if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) {
            return;
        }
        try {
            const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete product');
            setProducts(products.filter(p => p.id !== productId));
            alert('Product deleted successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const isEditing = !!editingProduct;
        const url = isEditing ? `/api/products/${editingProduct.id}` : '/api/products';
        const method = isEditing ? 'PUT' : 'POST';

        const productData = {
            name: productName,
            description: productDescription,
            variants: variants.map(v => ({
                id: v.id, // Pass ID for updates
                sku: v.sku,
                price: parseFloat(v.price) || 0,
                size: v.size,
                color: v.color,
                on_hand: parseInt(v.on_hand, 10) || 0, // Send on_hand instead of quantity
            })),
            tags: tags,
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

            const savedProduct = await response.json();

            if (isEditing) {
                setProducts(products.map(p => p.id === savedProduct.id ? savedProduct : p));
            } else {
                setProducts([savedProduct, ...products]);
            }

            resetForm();
            alert(`Product ${isEditing ? 'updated' : 'created'} successfully!`);

        } catch (error) {
            console.error('Submission failed:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateTags = async () => {
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
            const response = await fetch('/api/generate-tags', {
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
        if (tagInput && !tags.includes(tagInput.toLowerCase())) {
            setTags([...tags, tagInput.toLowerCase().trim()]);
            setTagInput('');
        }
    };
    const removeTag = (tagToRemove) => setTags(tags.filter(tag => tag !== tagToRemove));
    const handleVariantChange = (index, field, value) => {
        const updatedVariants = [...variants];
        if (field === 'on_hand') {
            // TODO: inventory_levels on hand returned as object but is currently treated like a variant property
            updatedVariants[index] = {...updatedVariants[index], inventory_levels: [{ ...updatedVariants[index].inventory_levels[0], on_hand: value}], on_hand: value};

        } else {
            updatedVariants[index] = {...updatedVariants[index], [field]: value};
        }
        setVariants(updatedVariants);
    };
    const addVariant = () => setVariants([...variants, { ...emptyVariant }]);
    const removeVariant = (index) => {
        if (variants.length > 1) setVariants(variants.filter((_, i) => i !== index));
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

            <div className="mb-6">
                <button
                    onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                    {showForm ? 'Cancel' : '+ Add New Product'}
                </button>

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg mt-4 space-y-6">
                        <h2 className="text-xl font-semibold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="productName" className="block text-sm font-medium mb-1">Product Name</label>
                                <input id="productName" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" required />
                            </div>
                            <div>
                                <label htmlFor="productDescription" className="block text-sm font-medium mb-1">Description</label>
                                <textarea id="productDescription" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" rows="3"></textarea>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-2">Product Image & Tags</h3>
                            <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-md">
                                <div className="flex-1">
                                    <label htmlFor="imageUpload" className="block text-sm font-medium mb-1">Upload Image</label>
                                    <input type="file" id="imageUpload" accept="image/png, image/jpeg, image/webp" onChange={(e) => setImageFile(e.target.files[0])} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600"/>
                                </div>
                                <button type="button" onClick={handleGenerateTags} disabled={!imageFile || isGeneratingTags} className="self-end bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">
                                    {isGeneratingTags ? 'Generating...' : 'Generate Tags with AI'}
                                </button>
                            </div>
                            <div className="mt-4">
                                <div className="flex gap-2">
                                    <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add a tag manually" className="flex-grow bg-gray-700 p-2 rounded-md" />
                                    <button type="button" onClick={addTag} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Add</button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {tags.map(tag => (
                                        <span key={tag} className="flex items-center bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)} className="ml-2 text-blue-200 hover:text-white">✕</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                             <h3 className="text-lg font-semibold mb-2">Product Variants</h3>
                            {variants.map((variant, index) => (
                                <div key={variant.id || index} className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3 p-3 bg-gray-900 rounded-md">
                                    <input type="text" placeholder="SKU" value={variant.sku} onChange={(e) => handleVariantChange(index, 'sku', e.target.value)} className="bg-gray-700 p-2 rounded-md" required />
                                    <input type="number" step="0.01" placeholder="Price" value={variant.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} className="bg-gray-700 p-2 rounded-md" required />
                                    <input type="text" placeholder="Size" value={variant.size} onChange={(e) => handleVariantChange(index, 'size', e.target.value)} className="bg-gray-700 p-2 rounded-md" required />
                                    <input type="text" placeholder="Color" value={variant.color} onChange={(e) => handleVariantChange(index, 'color', e.target.value)} className="bg-gray-700 p-2 rounded-md" required />
                                    <input type="number" placeholder="On Hand Stock" value={variant?.inventory_levels[0]?.on_hand} onChange={(e) => handleVariantChange(index, 'on_hand', e.target.value)} className="bg-gray-700 p-2 rounded-md" required />
                                    <button type="button" onClick={() => removeVariant(index)} disabled={isSubmitting || variants.length === 1} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md disabled:bg-gray-500">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Action buttons... */}
                        <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                           <button type="button" onClick={addVariant} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500">
                                Add Variant
                            </button>
                            <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500">
                                {isSubmitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Save Product')}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Manage Products</h2>
                {isLoading ? ( <p>Loading products...</p> ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900">
                                <tr>
                                    <th className="p-3">Product Name</th>
                                    <th className="p-3">Variants</th>
                                    <th className="p-3">Total Stock On Hand</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-3 font-medium">{product.name}</td>
                                        <td className="p-3">{product.product_variants?.length || 0}</td>
                                        {/* UPDATED: Calculate total stock */}
                                        <td className="p-3">
                                            {product.product_variants?.reduce((sum, v) => sum + (v.inventory_levels[0]?.on_hand || 0), 0)}
                                        </td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={() => handleEdit(product)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                                            <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}