// app/admin/categories/page.js
'use client';

import { useState, useEffect } from 'react';
import CategoryForm from '@/components/admin/CategoryForm';
import CategoryList from '@/components/admin/CategoryList';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function CategoriesPage() {
    const { addToast } = useToast(); // --- NEW ---
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    const handleDelete = async (categoryId) => {
        if (!confirm('Bạn có chắc không? Hành động này chỉ có thể thực hiện nếu danh mục không có danh mục con hoặc sản phẩm.')) return;
        try {
            const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Lưu trữ danh mục thất bại');

            setCategories(prev => prev.filter(c => c.id !== categoryId));
            addToast('Danh mục đã được lưu trữ thành công!', 'success'); // --- FIXED: Replaced alert() ---
        } catch (error) {
            addToast(error.message, 'error'); // --- FIXED: Replaced alert() ---
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setShowForm(true);
    };

    const handleFormSuccess = (message) => {
        addToast(message, 'success'); // --- FIXED: Replaced alert() ---
        setShowForm(false);
        setEditingCategory(null);
        fetchCategories();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Quản lý Danh mục</h1>

            {/* Actions Bar */}
            {!showForm && (
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <button
                        onClick={() => { setEditingCategory(null); setShowForm(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Thêm Danh mục Mới
                    </button>

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
                            <CategoryList
                                categories={categories}
                                searchQuery={searchQuery}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}