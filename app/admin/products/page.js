// app/admin/products/page.js
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ProductFilters from '@/components/admin/ProductFilters';
import ProductForm from '@/components/admin/ProductForm';
import ProductImportExport from '@/components/admin/ProductImportExport';

export default function AdminProductsPage() {
    // --- Data State ---
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- View State ---
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedProductIds, setSelectedProductIds] = useState([]);

    // --- Filter & Sort State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterCollection, setFilterCollection] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [filterStock, setFilterStock] = useState('all');
    const [sortOption, setSortOption] = useState('newest');

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [productsRes, categoriesRes, collectionsRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/categories'),
                fetch('/api/collections')
            ]);

            if (!productsRes.ok || !categoriesRes.ok || !collectionsRes.ok) {
                throw new Error('Failed to fetch data');
            }

            const productsData = await productsRes.json();
            setProducts(productsData || []);
            setCategories(await categoriesRes.json() || []);
            setCollections(await collectionsRes.json() || []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            alert("Error loading data. Please refresh.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Computed Values ---
    const allUniqueTags = useMemo(() => {
        const tagsSet = new Set();
        products.forEach(p => {
            if (p.tags && Array.isArray(p.tags)) {
                p.tags.forEach(t => tagsSet.add(t.name));
            }
        });
        return Array.from(tagsSet).sort();
    }, [products]);

    const filteredAndSortedProducts = useMemo(() => {
        let result = [...products];

        // 1. Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.product_variants.some(v => v.sku.toLowerCase().includes(query))
            );
        }
        if (filterCategory) {
            result = result.filter(p => p.categories?.some(c => c.id.toString() === filterCategory));
        }
        if (filterCollection) {
            result = result.filter(p => p.collections?.some(c => c.id.toString() === filterCollection));
        }
        if (filterTag) {
            result = result.filter(p => p.tags?.some(t => t.name === filterTag));
        }
        if (filterStock !== 'all') {
            result = result.filter(p => {
                const totalStock = p.product_variants?.reduce((sum, v) => sum + (v.inventory_levels?.[0]?.on_hand || 0), 0) || 0;
                if (filterStock === 'in_stock') return totalStock > 0;
                if (filterStock === 'out_of_stock') return totalStock <= 0;
                if (filterStock === 'low_stock') return totalStock > 0 && totalStock < 10;
                return true;
            });
        }

        // 2. Sort
        result.sort((a, b) => {
            switch (sortOption) {
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'price_asc': return (a.product_variants[0]?.price || 0) - (b.product_variants[0]?.price || 0);
                case 'price_desc': return (b.product_variants[0]?.price || 0) - (a.product_variants[0]?.price || 0);
                case 'stock_asc':
                    return (a.product_variants?.reduce((s, v) => s + (v.inventory_levels?.[0]?.on_hand || 0), 0)) -
                        (b.product_variants?.reduce((s, v) => s + (v.inventory_levels?.[0]?.on_hand || 0), 0));
                case 'stock_desc':
                    return (b.product_variants?.reduce((s, v) => s + (v.inventory_levels?.[0]?.on_hand || 0), 0)) -
                        (a.product_variants?.reduce((s, v) => s + (v.inventory_levels?.[0]?.on_hand || 0), 0));
                case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
                case 'newest': default: return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        return result;
    }, [products, searchQuery, filterCategory, filterCollection, filterTag, filterStock, sortOption]);

    const allVisibleProductsSelected = filteredAndSortedProducts.length > 0 &&
        filteredAndSortedProducts.every(p => selectedProductIds.includes(p.id));

    // --- Handlers ---

    const handleEdit = (product) => {
        setEditingProduct(product);
        setShowForm(true);
    };

    const handleDelete = async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete');
            }
            setProducts(products.filter(p => p.id !== productId));
            // Also remove from selected if present
            setSelectedProductIds(prev => prev.filter(id => id !== productId));
            alert('Product deleted successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleSelectProduct = (productId) => {
        setSelectedProductIds(prev =>
            prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
        );
    };

    const handleSelectAllProducts = (e) => {
        if (e.target.checked) {
            setSelectedProductIds(filteredAndSortedProducts.map(p => p.id));
        } else {
            setSelectedProductIds([]);
        }
    };

    const handleFormSuccess = (message) => {
        alert(message);
        setShowForm(false);
        setEditingProduct(null);
        fetchData(); // Refresh data
    };

    const handleFormCancel = () => {
        setShowForm(false);
        setEditingProduct(null);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Products</h1>

            {/* Top Actions */}
            {!showForm && (
                <div className="mb-6">
                    <button
                        onClick={() => { setEditingProduct(null); setShowForm(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Add New Product
                    </button>
                </div>
            )}

            {/* Product Form Component */}
            {showForm ? (
                <ProductForm
                    initialData={editingProduct}
                    categories={categories}
                    collections={collections}
                    onSuccess={handleFormSuccess}
                    onCancel={handleFormCancel}
                />
            ) : (
                <>
                    {/* Filters */}
                    <ProductFilters
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        filterCategory={filterCategory}
                        setFilterCategory={setFilterCategory}
                        filterCollection={filterCollection}
                        setFilterCollection={setFilterCollection}
                        filterTag={filterTag}
                        setFilterTag={setFilterTag}
                        filterStock={filterStock}
                        setFilterStock={setFilterStock}
                        sortOption={sortOption}
                        setSortOption={setSortOption}
                        categories={categories}
                        collections={collections}
                        allTags={allUniqueTags}
                    />

                    {/* Import/Export Component */}
                    <ProductImportExport
                        selectedProductIds={selectedProductIds}
                        onImportSuccess={fetchData}
                    />

                    {/* Products Table */}
                    <div className="bg-gray-800 p-6 rounded-lg mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Existing Products</h2>
                            <span className="text-sm text-gray-400">
                                Showing {filteredAndSortedProducts.length} of {products.length}
                            </span>
                        </div>

                        {isLoading ? (
                            <p className="text-center py-8 text-gray-400">Loading products...</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left table-auto">
                                    <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                                    <tr>
                                        <th className="p-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={allVisibleProductsSelected}
                                                onChange={handleSelectAllProducts}
                                                className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </th>
                                        <th className="p-3 w-1/3">Product Name</th>
                                        <th className="p-3">Variants</th>
                                        <th className="p-3">Total Stock</th>
                                        <th className="p-3">Category</th>
                                        <th className="p-3">Collections</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                    {filteredAndSortedProducts.map(product => (
                                        <tr key={product.id} className="hover:bg-gray-700/50 text-sm align-top">
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductIds.includes(product.id)}
                                                    onChange={() => handleSelectProduct(product.id)}
                                                    className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="p-3 font-medium">
                                                <span className="text-white text-base">{product.name}</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {product.tags?.slice(0, 3).map(t => (
                                                        <span key={t.id} className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{t.name}</span>
                                                    ))}
                                                    {product.tags?.length > 3 && <span className="text-[10px] text-gray-500 self-center">+{product.tags.length - 3}</span>}
                                                </div>
                                            </td>
                                            <td className="p-3 text-gray-300">{product.product_variants?.length || 0}</td>
                                            <td className="p-3 text-gray-300">
                                                {product.product_variants?.reduce((sum, v) => sum + (v.inventory_levels?.[0]?.on_hand || 0), 0)}
                                            </td>
                                            <td className="p-3 text-gray-300">{product.categories?.[0]?.name || '-'}</td>
                                            <td className="p-3 text-gray-300">
                                                {product.collections?.length > 0
                                                    ? product.collections.map(c => c.name).join(', ')
                                                    : '-'
                                                }
                                            </td>
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="text-indigo-400 hover:text-indigo-300 font-semibold mr-3"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="text-red-500 hover:text-red-400 font-semibold"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                {!isLoading && filteredAndSortedProducts.length === 0 && (
                                    <p className="text-gray-500 mt-8 text-center">No products match your filters.</p>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}