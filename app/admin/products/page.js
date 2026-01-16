// app/admin/products/page.js
'use client';

import {useState, useEffect, useMemo, useCallback} from 'react';
import Link from 'next/link';
import ProductFilters from '@/components/admin/ProductFilters';
import ProductImportExport from '@/components/admin/ProductImportExport';
import TagGenerationModal from '@/components/admin/TagGenerationModal';
import PaginationControls from '@/components/ui/PaginationControls';
import BulkImportModal from '@/components/admin/BulkImportModal';
import {useToast} from '@/context/ToastContext';

export default function AdminProductsPage() {
    const {addToast} = useToast();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isTagGenModalOpen, setIsTagGenModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' (Standard) | 'generated' (AI)

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterCollection, setFilterCollection] = useState('');
    const [filterAttribute, setFilterAttribute] = useState('');
    const [filterStock, setFilterStock] = useState('all');
    const [sortOption, setSortOption] = useState('newest');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // [FIX] Send 'type' to server so pagination counts are correct for the specific tab
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: searchQuery,
                scope: 'admin',
                type: activeTab === 'generated' ? 'ai' : 'standard'
            });

            const [productsRes, categoriesRes, collectionsRes] = await Promise.all([
                fetch(`/api/products?${params.toString()}`),
                fetch('/api/categories'),
                fetch('/api/collections')
            ]);

            if (!productsRes.ok || !categoriesRes.ok || !collectionsRes.ok) {
                throw new Error('Failed to fetch data');
            }

            const result = await productsRes.json();

            if (result.data) {
                setProducts(result.data);
                setTotalItems(result.meta.total);
                setTotalPages(result.meta.totalPages);
            } else {
                setProducts(result || []);
            }

            setCategories(await categoriesRes.json() || []);

            const collectionsData = await collectionsRes.json();
            setCollections(collectionsData.data || []);

        } catch (error) {
            console.error("Failed to fetch data:", error);
            addToast("Không thể tải dữ liệu sản phẩm.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, searchQuery, activeTab, addToast]); // [FIX] Added activeTab dependency

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timeout);
    }, [fetchData]);

    const allAttributes = useMemo(() => {
        const attrSet = new Set();
        products.forEach(p => {
            if (p.attributes && Array.isArray(p.attributes)) {
                p.attributes.forEach(a => attrSet.add(a.name));
            }
            if (p.product_variants) {
                p.product_variants.forEach(v => {
                    if (v.attributes) {
                        Object.values(v.attributes).forEach(val => attrSet.add(val));
                    }
                });
            }
        });
        return Array.from(attrSet).sort();
    }, [products]);

    const filteredAndSortedProducts = useMemo(() => {
        let result = [...products];

        // [FIX] Removed client-side [AI] filtering.
        // The server now returns exactly what we need for the current page & tab.

        if (filterCategory) {
            result = result.filter(p => p.catalog_categories?.some(c => c.id.toString() === filterCategory));
        }
        if (filterCollection) {
            result = result.filter(p => p.collections?.some(c => c.id.toString() === filterCollection));
        }
        if (filterAttribute) {
            result = result.filter(p => {
                const hasGlobal = p.attributes?.some(a => a.name === filterAttribute);
                const hasVariant = p.product_variants?.some(v =>
                    v.attributes && Object.values(v.attributes).includes(filterAttribute)
                );

                return hasGlobal || hasVariant;
            });
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

        result.sort((a, b) => {
            switch (sortOption) {
                case 'name_asc':
                    return a.name.localeCompare(b.name);
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                case 'price_asc':
                    return (a.product_variants[0]?.price || 0) - (b.product_variants[0]?.price || 0);
                case 'price_desc':
                    return (b.product_variants[0]?.price || 0) - (a.product_variants[0]?.price || 0);
                case 'stock_asc':
                    return (a.product_variants?.reduce((s, v) => s + (v.inventory_levels?.[0]?.on_hand || 0), 0)) -
                        (b.product_variants?.reduce((s, v) => s + (v.inventory_levels?.[0]?.on_hand || 0), 0));
                case 'stock_desc':
                    return (b.product_variants?.reduce((s, v) => s + (v.inventory_levels?.[0]?.on_hand || 0), 0)) -
                        (a.product_variants?.reduce((s, v) => s + (v.inventory_levels?.[0]?.on_hand || 0), 0));
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'newest':
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        return result;
    }, [products, filterCategory, filterCollection, filterAttribute, filterStock, sortOption, searchQuery]);

    const allVisibleProductsSelected = filteredAndSortedProducts.length > 0 &&
        filteredAndSortedProducts.every(p => selectedProductIds.includes(p.id));

    const handleDelete = async (productId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) return;
        try {
            const response = await fetch(`/api/products/${productId}`, {method: 'DELETE'});
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Lưu trữ sản phẩm thất bại');
            }
            fetchData();
            setSelectedProductIds(prev => prev.filter(id => id !== productId));
            addToast('Sản phẩm đã được lưu trữ thành công!', 'success');
        } catch (error) {
            addToast(`Lỗi: ${error.message}`, 'error');
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

    const handlePageChange = (newPage) => setPage(newPage);
    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    const handleBulkAction = async (action) => {
        if (action === 'delete' && !confirm(`Bạn có chắc muốn xóa ${selectedProductIds.length} sản phẩm đã chọn?`)) {
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/products/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedProductIds, action })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Bulk action failed');
            
            addToast(data.message, 'success');
            setSelectedProductIds([]);
            fetchData();
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // [FIX] Handle Tab Change properly
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setPage(1); // Reset to page 1 to avoid "Page 5 of 2" errors
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="flex justify-between items-start mb-6">
                <h1 className="text-3xl font-bold">Quản lý Sản phẩm</h1>

                <div className="flex gap-3">
                    <button
                        onClick={() => setIsTagGenModalOpen(true)}
                        className="bg-gray-800 hover:bg-gray-700 text-purple-400 border border-purple-500/30 font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span className="text-xl">🏷️</span> Auto-Tags
                    </button>

                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-gray-800 hover:bg-gray-700 text-indigo-400 border border-indigo-500/30 font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span className="text-xl">✨</span> Nhập từ AI
                    </button>

                    <Link
                        href="/admin/products/create"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Thêm Sản phẩm mới
                    </Link>
                </div>
            </div>

            <BulkImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onComplete={() => {
                    fetchData();
                    setActiveTab('generated');
                }}
            />

            <TagGenerationModal
                isOpen={isTagGenModalOpen}
                onClose={() => setIsTagGenModalOpen(false)}
                selectedIds={selectedProductIds}
                onComplete={() => {
                    fetchData();
                    addToast("Tag generation complete!", "success");
                }}
            />

            {/* Bulk Actions Bar */}
            {selectedProductIds.length > 0 && (
                <div className="bg-gray-800 border border-indigo-500/50 rounded-lg p-3 mb-6 flex justify-between items-center animate-fade-in-up">
                    <span className="font-medium text-white ml-2">{selectedProductIds.length} sản phẩm được chọn</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBulkAction('publish')}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                            ✓ Xuất bản
                        </button>
                        <button
                            onClick={() => handleBulkAction('draft')}
                            disabled={isLoading}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                            Draft
                        </button>
                        <button
                            onClick={() => handleBulkAction('delete')}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                            🗑️ Xóa
                        </button>
                    </div>
                </div>
            )}

            <>
                <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg w-fit mb-6 border border-gray-700">
                    <button
                        onClick={() => handleTabChange('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            activeTab === 'all'
                                ? 'bg-gray-700 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                    >
                        Sản phẩm tiêu chuẩn
                    </button>
                    <button
                        onClick={() => handleTabChange('generated')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'generated'
                                ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 shadow-sm'
                                : 'text-gray-400 hover:text-indigo-300 hover:bg-gray-800'
                        }`}
                    >
                        <span>✨</span> Bản nháp AI
                    </button>
                </div>

                <ProductFilters
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterCategory={filterCategory}
                    setFilterCategory={setFilterCategory}
                    filterCollection={filterCollection}
                    setFilterCollection={setFilterCollection}
                    filterTag={filterAttribute}
                    setFilterTag={setFilterAttribute}
                    filterStock={filterStock}
                    setFilterStock={setFilterStock}
                    sortOption={sortOption}
                    setSortOption={setSortOption}
                    categories={categories}
                    collections={collections}
                    allTags={allAttributes}
                />

                <ProductImportExport
                    selectedProductIds={selectedProductIds}
                    onImportSuccess={fetchData}
                />

                <div className="bg-gray-800 p-6 rounded-lg mt-8 border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            {activeTab === 'generated' ? (
                                <><span className="text-indigo-400">✨</span> Bản nháp được tạo</>
                            ) : (
                                'Sản phẩm hiện có'
                            )}
                        </h2>
                        <span className="text-sm text-gray-400">
                            Hiển thị {filteredAndSortedProducts.length} mục
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        <>
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
                                        <th className="p-3 w-1/3">Tên sản phẩm</th>
                                        <th className="p-3">Biến thể</th>
                                        <th className="p-3">Tổng tồn kho</th>
                                        <th className="p-3">Danh mục</th>
                                        <th className="p-3 text-right">Hành động</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                    {filteredAndSortedProducts.length > 0 ? (
                                        filteredAndSortedProducts.map(product => (
                                            <tr key={product.id} className="hover:bg-gray-700/50 text-sm align-top transition-colors">
                                                <td className="p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProductIds.includes(product.id)}
                                                        onChange={() => handleSelectProduct(product.id)}
                                                        className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="p-3 font-medium">
                                                    <div className="flex items-start gap-3">
                                                        {product.image_url && (
                                                            <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover border border-gray-700"/>
                                                        )}
                                                        <div>
                                                            <span className={`${product.name.startsWith('[AI]') ? 'text-indigo-300' : 'text-white'} text-base block`}>
                                                                {product.name}
                                                            </span>
                                                            {/* Status Badge */}
                                                            {product.status === 'draft' && (
                                                                <span className="inline-block mt-1 mr-2 px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-300 border border-gray-600">
                                                                    Nháp
                                                                </span>
                                                            )}

                                                            {/* Attributes */}
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {product.attributes?.slice(0, 4).map(attr => (
                                                                    <span key={attr.id} className="text-[10px] bg-purple-900/30 text-purple-200 px-1.5 py-0.5 rounded border border-purple-800/50">
                                                            {attr.name}
                                                        </span>
                                                                ))}
                                                                {product.attributes?.length > 4 && (
                                                                    <span className="text-[10px] text-gray-500">+{product.attributes.length - 4}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-gray-300 pt-4">{product.product_variants?.length || 0}</td>
                                                <td className="p-3 text-gray-300 pt-4">
                                                    {product.product_variants?.reduce((sum, v) => sum + (v.inventory_levels?.on_hand || 0), 0)}
                                                </td>
                                                <td className="p-3 text-gray-300 pt-4">
                                                    {product.catalog_categories?.[0]?.name || '-'}
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap pt-4">
                                                    <Link
                                                        href={`/admin/products/${product.id}`}
                                                        className="text-indigo-400 hover:text-indigo-300 font-semibold mr-3 transition-colors"
                                                    >
                                                        {activeTab === 'generated' ? 'Duyệt' : 'Sửa'}
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="text-red-500 hover:text-red-400 font-semibold transition-colors"
                                                    >
                                                        Xóa
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-500">
                                                {activeTab === 'generated'
                                                    ? "Không tìm thấy bản nháp nào do AI tạo. Nhấn 'Nhập từ AI' để tạo!"
                                                    : "Không có sản phẩm nào khớp với bộ lọc của bạn."}
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            <PaginationControls
                                currentPage={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                limit={limit}
                                onPageChange={handlePageChange}
                                onLimitChange={handleLimitChange}
                                isLoading={isLoading}
                            />
                        </>
                    )}
                </div>
            </>
        </div>
    );
}