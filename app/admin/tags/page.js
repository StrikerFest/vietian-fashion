// app/admin/tags/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import TagForm from '@/components/admin/TagForm';
import TagList from '@/components/admin/TagList';
import { useToast } from '@/context/ToastContext';

export default function TagsPage() {
    const { addToast } = useToast();
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTag, setEditingTag] = useState(null);

    const fetchTags = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/tags');
            if (!response.ok) throw new Error('Failed to fetch tags');
            const data = await response.json();
            setTags(data || []);
        } catch (error) {
            console.error("Failed to fetch tags:", error);
            addToast("Không thể tải danh sách thẻ.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    const filteredTags = useMemo(() => {
        if (!searchQuery) return tags;
        return tags.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [tags, searchQuery]);

    const handleDelete = async (id) => {
        if (!confirm('Bạn có chắc không? Hành động này chỉ hoạt động nếu thẻ chưa được sử dụng.')) return;
        try {
            const response = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete tag');

            setTags(prev => prev.filter(t => t.id !== id));
            addToast('Thẻ đã được lưu trữ thành công.', 'success');
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handleFormSuccess = (message) => {
        addToast(message, 'success');
        setEditingTag(null);
        fetchTags();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Quản Lý Thẻ (Tags)</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="md:col-span-1">
                    <TagForm
                        initialData={editingTag}
                        onSuccess={handleFormSuccess}
                        onCancel={() => setEditingTag(null)}
                    />
                </div>

                {/* Right Column: List */}
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-semibold">Thẻ hiện có</h2>
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Tìm kiếm thẻ..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
                        </div>
                    </div>

                    {isLoading ? (
                        <p className="text-gray-400 text-center">Đang tải thẻ...</p>
                    ) : (
                        <TagList
                            tags={filteredTags}
                            onEdit={setEditingTag}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}