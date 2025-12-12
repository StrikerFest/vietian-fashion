// components/admin/TagForm.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function TagForm({ initialData, onSuccess, onCancel }) {
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
        } else {
            setName('');
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        const isEditing = !!initialData;
        const url = isEditing ? `/api/tags/${initialData.id}` : '/api/tags';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Thao tác thất bại');
            }

            onSuccess(isEditing ? 'Cập nhật thẻ thành công!' : 'Tạo thẻ thành công!');
            setName('');
        } catch (error) {
            addToast(`Lỗi: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">{initialData ? 'Sửa Thẻ' : 'Thêm Thẻ Mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">Tên thẻ</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                        placeholder="vd: vintage, cotton"
                        required
                    />
                </div>
                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600"
                    >
                        {isSubmitting ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Tạo mới')}
                    </button>
                    {initialData && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                        >
                            Hủy
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}