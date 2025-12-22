// components/admin/CollectionForm.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
// [MODIFIED] Import shared helper
import { generateSlug } from '@/utils/format';

export default function CollectionForm({ initialData, onSuccess, onCancel }) {
    const { addToast } = useToast();

    // [MODIFIED] Added slug state
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        slug: initialData?.slug || '',
        description: initialData?.description || '',
        is_featured: initialData?.is_featured || false,
        seo_title: initialData?.seo_title || '',
        seo_description: initialData?.seo_description || ''
    });

    const [isManuallyEdited, setIsManuallyEdited] = useState(!!initialData?.slug);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // [MODIFIED] Auto-generate slug when name changes, UNLESS user manually edited the slug
    useEffect(() => {
        if (!isManuallyEdited && formData.name) {
            setFormData(prev => ({
                ...prev,
                slug: generateSlug(formData.name)
            }));
        }
    }, [formData.name, isManuallyEdited]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSlugChange = (e) => {
        handleChange('slug', e.target.value);
        setIsManuallyEdited(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const isEditing = !!initialData;
        const url = isEditing ? `/api/collections/${initialData.id}` : '/api/collections';
        const method = isEditing ? 'PUT' : 'POST';

        // [MODIFIED] Send the complete formData including slug
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Thao tác thất bại');
            }

            onSuccess(isEditing ? 'Cập nhật bộ sưu tập thành công!' : 'Tạo bộ sưu tập thành công!');
        } catch (error) {
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">{initialData ? 'Sửa Bộ sưu tập' : 'Thêm Bộ sưu tập Mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-1">Tên bộ sưu tập</label>
                        <input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    {/* [MODIFIED] Added Slug Field */}
                    <div>
                        <label htmlFor="slug" className="block text-sm font-medium mb-1">Slug (URL)</label>
                        <input
                            id="slug"
                            type="text"
                            value={formData.slug}
                            onChange={handleSlugChange}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-gray-300"
                            placeholder="tu-dong-tao"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-1">Mô tả</label>
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                        rows="3"
                    ></textarea>
                </div>

                <div className="flex items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                    <input
                        id="isFeatured"
                        type="checkbox"
                        checked={formData.is_featured}
                        onChange={(e) => handleChange('is_featured', e.target.checked)}
                        className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="isFeatured" className="ml-2 block text-sm font-medium cursor-pointer">Hiển thị nổi bật trên trang chủ</label>
                </div>

                {/* SEO Section */}
                <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Cài đặt SEO</p>
                    <div className="mb-3">
                        <label htmlFor="seoTitle" className="block text-xs font-medium mb-1 text-gray-300">Tiêu đề SEO</label>
                        <input
                            id="seoTitle"
                            type="text"
                            value={formData.seo_title}
                            onChange={(e) => handleChange('seo_title', e.target.value)}
                            placeholder="Tối đa 60 ký tự"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="seoDescription" className="block text-xs font-medium mb-1 text-gray-300">Mô tả Meta</label>
                        <textarea
                            id="seoDescription"
                            value={formData.seo_description}
                            onChange={(e) => handleChange('seo_description', e.target.value)}
                            placeholder="Tối đa 160 ký tự"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                            rows="2"
                        ></textarea>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600"
                    >
                        {isSubmitting ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Tạo mới')}
                    </button>
                </div>
            </form>
        </div>
    );
}