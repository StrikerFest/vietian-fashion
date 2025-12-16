// app/admin/categories/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import CategoryForm from '@/components/admin/CategoryForm';
import CategoryList from '@/components/admin/CategoryList';
import PaginationControls from '@/components/ui/PaginationControls'; // --- NEW: Added Paginator ---
import { useToast } from '@/context/ToastContext';

export default function CategoriesPage() {
    const { addToast } = useToast();
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Filter & Pagination State ---
    const [filterType, setFilterType] = useState('all'); // 'all' | 'catalog' | 'attribute'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/categories');
            const data = await response.json();
            setCategories(data || []);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
            addToast("Không thể tải danh mục.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // --- Logic: Filter -> Search -> Get Roots -> Paginate ---
    const processedData = useMemo(() => {
        let filtered = [...categories];

        // 1. Filter by Type
        if (filterType !== 'all') {
            filtered = filtered.filter(c => c.type === filterType);
        }

        // 2. Filter by Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            // If searching, we might want to show flattened list or just roots that match?
            // For a tree view, usually searching flattens results or expands path.
            // Let's return flattened results for search to keep it simple as implemented in original List
            return {
                isSearchMode: true,
                roots: filtered.filter(c => c.name.toLowerCase().includes(lowerQuery)),
                totalItems: filtered.filter(c => c.name.toLowerCase().includes(lowerQuery)).length
            };
        }

        // 3. Get Roots (Top Level Only)
        // We only paginate top-level categories. Children are rendered recursively by the component.
        const roots = filtered.filter(c => !c.parent_id);

        // 4. Sort Roots (by order then name)
        roots.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));

        const totalItems = roots.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // 5. Paginate Roots
        const start = (currentPage - 1) * itemsPerPage;
        const paginatedRoots = roots.slice(start, start + itemsPerPage);

        return {
            isSearchMode: false,
            roots: paginatedRoots,
            totalItems,
            totalPages
        };

    }, [categories, filterType, searchQuery, currentPage, itemsPerPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterType, searchQuery, itemsPerPage]);


    const handleDelete = async (categoryId) => {
        if (!confirm('Bạn có chắc không? Hành động này chỉ có thể thực hiện nếu danh mục không có danh mục con hoặc sản phẩm.')) return;
        try {
            const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Lưu trữ danh mục thất bại');

            setCategories(prev => prev.filter(c => c.id !== categoryId));
            addToast('Danh mục đã được lưu trữ thành công!', 'success');
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setShowForm(true);
    };

    const handleFormSuccess = (message) => {
        addToast(message, 'success');
        setShowForm(false);
        setEditingCategory(null);
        fetchCategories();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Quản lý Danh mục</h1>

            {/* Actions Bar */}
            {!showForm && (
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => { setEditingCategory(null); setShowForm(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors whitespace-nowrap"
                            >
                                + Thêm Danh mục
                            </button>

                            {/* Filter Dropdown */}
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">Tất cả loại</option>
                                <option value="catalog">Catalog (Menu)</option>
                                <option value="attribute">Attribute (Bộ lọc)</option>
                            </select>
                        </div>

                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Tìm kiếm danh mục..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {showForm ? (
                    <div className="max-w-2xl">
                        <CategoryForm
                            initialData={editingCategory}
                            categories={categories}
                            onSuccess={handleFormSuccess}
                            onCancel={() => { setShowForm(false); setEditingCategory(null); }}
                        />
                    </div>
                ) : (
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        {isLoading ? (
                            <p className="text-gray-400 text-center">Đang tải danh mục...</p>
                        ) : (
                            <>
                                <CategoryList
                                    categories={categories} // Pass full list for child lookup
                                    rootCategories={processedData.roots} // Pass paginated roots to render
                                    searchQuery={searchQuery}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />

                                {/* Hide pagination if searching (since we show all matches) or if no items */}
                                {!processedData.isSearchMode && processedData.totalItems > 0 && (
                                    <PaginationControls
                                        currentPage={currentPage}
                                        totalPages={processedData.totalPages}
                                        totalItems={processedData.totalItems}
                                        limit={itemsPerPage}
                                        onPageChange={setCurrentPage}
                                        onLimitChange={setItemsPerPage}
                                        isLoading={isLoading}
                                    />
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}