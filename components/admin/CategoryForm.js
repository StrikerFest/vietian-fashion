// components/admin/CategoryForm.js
'use client';
import { useState } from 'react';

export default function CategoryForm({ initialData, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        slug: initialData?.slug || '',
        description: initialData?.description || '',
        parent_id: initialData?.parent_id || '',
        image_url: initialData?.image_url || '',
        type: initialData?.type || 'catalog',
        is_active: initialData?.is_active ?? true,
        // Ensure we slice correctly for datetime-local input
        start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString().slice(0, 16) : '',
        end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString().slice(0, 16) : ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...formData };

        if (!payload.parent_id) payload.parent_id = null;
        if (!payload.start_date) payload.start_date = null;
        if (!payload.end_date) payload.end_date = null;

        // [MODIFIED] Enforce Vietnam Timezone (+07:00) on Save
        // This ensures that if you pick 10:00 AM, it is saved as 10:00 AM VN Time (03:00 UTC)
        // instead of 10:00 AM UTC (17:00 VN Time).
        if (payload.start_date && !payload.start_date.includes('Z') && !payload.start_date.includes('+')) {
            payload.start_date = `${payload.start_date}:00+07:00`;
        }
        if (payload.end_date && !payload.end_date.includes('Z') && !payload.end_date.includes('+')) {
            payload.end_date = `${payload.end_date}:00+07:00`;
        }

        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {/* Basic Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Tên danh mục</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Slug (URL)</label>
                        <input
                            type="text"
                            required
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Mô tả</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Time Fencing Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-indigo-400 mb-1">Ngày bắt đầu (VN Time)</label>
                        <input
                            type="datetime-local"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-400 mb-1">Ngày kết thúc (VN Time)</label>
                        <input
                            type="datetime-local"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center gap-3 pt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-300">Kích hoạt ngay</span>
                    </label>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
                >
                    Lưu danh mục
                </button>
            </div>
        </form>
    );
}