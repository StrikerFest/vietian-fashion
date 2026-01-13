// app/admin/categories/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import CategoryForm from '@/components/admin/CategoryForm';
import CategoryList from '@/components/admin/CategoryList';
import PaginationControls from '@/components/ui/PaginationControls';
import { useToast } from '@/context/ToastContext';

// Helper to get all descendant IDs for selection
const getAllDescendantIds = (categories, parentId) => {
    const descendants = new Set();
    const queue = [parentId];
    while (queue.length > 0) {
        const currentId = queue.shift();
        const children = categories.filter(c => c.parent_id === currentId);
        for (const child of children) {
            descendants.add(child.id);
            queue.push(child.id);
        }
    }
    return descendants;
};


export default function CategoriesPage() {
    const { addToast } = useToast();
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Selection State ---
    const [selectedIds, setSelectedIds] = useState(new Set());

    // --- Filter & Pagination State ---
    const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'attribute'
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

        // 1. Filter by Type (Tab)
        filtered = filtered.filter(c => c.type === activeTab);

        // 2. Filter by Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const searchResults = filtered.filter(c => c.name.toLowerCase().includes(lowerQuery));
            return {
                isSearchMode: true,
                roots: searchResults, // show flat list for search
                allVisibleIds: new Set(searchResults.map(c => c.id)),
                totalItems: searchResults.length,
            };
        }

        // 3. Get Roots (Top Level Only)
        // Note: We only want roots that belong to the current tab type.
        // Since we already filtered by type, we just check parent_id.
        // However, if a child has the same type but its parent is NOT in this type (unlikely but possible), 
        // it would look like a root here if we don't check carefully.
        // Assuming strict type consistency for now.
        const roots = filtered.filter(c => !c.parent_id);
        roots.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));

        const totalItems = roots.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // 4. Paginate Roots
        const start = (currentPage - 1) * itemsPerPage;
        const paginatedRoots = roots.slice(start, start + itemsPerPage);

        // 5. Get all visible IDs for "Select All" logic
        const allVisibleIds = new Set(paginatedRoots.map(r => r.id));
        paginatedRoots.forEach(root => {
            getAllDescendantIds(categories, root.id).forEach(id => allVisibleIds.add(id));
        });

        return {
            isSearchMode: false,
            roots: paginatedRoots,
            allVisibleIds,
            totalItems,
            totalPages
        };

    }, [categories, activeTab, searchQuery, currentPage, itemsPerPage]);

    // Reset page and selection when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set()); // Clear selection on filter/search change
    }, [activeTab, searchQuery, itemsPerPage]);

    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            setSelectedIds(new Set(processedData.allVisibleIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    // --- CRUD Handlers ---
    const handleDelete = async (categoryId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa danh mục này không? Các danh mục con sẽ bị tách ra và sản phẩm thuộc danh mục này sẽ bị loại bỏ liên kết.')) return;
        try {
            const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Lưu trữ danh mục thất bại');

            setCategories(prev => prev.filter(c => c.id !== categoryId));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(categoryId);
                return next;
            });
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
        fetchCategories(); // Refreshes the list
    };

    const [isBulkLoading, setIsBulkLoading] = useState(false);

    // --- ... (rest of the state declarations) ... ---

    // ... (useEffect hooks and other functions) ...

    // --- Bulk Action Handler ---
    const handleBulkAction = async (action) => {
        if (selectedIds.size === 0) return;

        if (action === 'delete') {
            if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} mục đã chọn không? Các danh mục con sẽ bị tách ra và sản phẩm thuộc các danh mục này sẽ bị loại bỏ liên kết.`)) {
                return;
            }
        }

        setIsBulkLoading(true);
        try {
            const response = await fetch('/api/admin/categories/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds), action }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Thao tác ${action} thất bại`);
            }

            addToast(result.message || 'Thao tác hàng loạt thành công!', 'success');

        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setSelectedIds(new Set());
            fetchCategories(); // Refresh data
            setIsBulkLoading(false);
        }
    };

    const isAllSelected = processedData.allVisibleIds && selectedIds.size > 0 && processedData.allVisibleIds.size === selectedIds.size;
    const isIndeterminate = selectedIds.size > 0 && !isAllSelected;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Quản lý Danh mục</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-700 pb-1">
                <button
                    onClick={() => setActiveTab('catalog')}
                    className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${
                        activeTab === 'catalog' 
                        ? 'text-indigo-400 border-indigo-500' 
                        : 'text-gray-400 border-transparent hover:text-white'
                    }`}
                >
                    Catalog (Menu)
                </button>
                <button
                    onClick={() => setActiveTab('attribute')}
                    className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${
                        activeTab === 'attribute' 
                        ? 'text-indigo-400 border-indigo-500' 
                        : 'text-gray-400 border-transparent hover:text-white'
                    }`}
                >
                    Attribute (Bộ lọc)
                </button>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-gray-800 border border-indigo-500/50 rounded-lg p-3 mb-6 flex justify-between items-center animate-fade-in-up">
                    <span className="font-medium">{selectedIds.size} mục được chọn</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBulkAction('enable')}
                            disabled={isBulkLoading}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isBulkLoading ? 'Đang xử lý...' : '✓ Đặt hoạt động'}
                        </button>
                        <button
                            onClick={() => handleBulkAction('disable')}
                            disabled={isBulkLoading}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isBulkLoading ? 'Đang xử lý...' : '∅ Đặt không hoạt động'}
                        </button>
                        <button
                            onClick={() => handleBulkAction('delete')}
                            disabled={isBulkLoading}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isBulkLoading ? 'Đang xử lý...' : '🗑️ Xóa'}
                        </button>
                    </div>
                </div>
            )}


            {/* Main Actions Bar */}
            {!showForm && (
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {/* Select All Checkbox */}
                            <input
                                type="checkbox"
                                className="w-5 h-5 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={isAllSelected}
                                ref={el => el && (el.indeterminate = isIndeterminate)}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                title={isIndeterminate ? "Một vài mục đã được chọn" : "Chọn tất cả mục đang hiển thị"}
                            />

                            <button
                                onClick={() => { setEditingCategory({ type: activeTab }); setShowForm(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors whitespace-nowrap"
                            >
                                + Thêm Danh mục
                            </button>
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
                                    categories={categories}
                                    rootCategories={processedData.roots}
                                    selectedIds={selectedIds}
                                    onSelectionChange={setSelectedIds}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
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