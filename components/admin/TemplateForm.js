// components/admin/TemplateForm.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function TemplateForm({ initialData, onSuccess, onCancel }) {
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [type, setType] = useState('marketing'); // 'marketing', 'wishlist_sale', 'order_confirm'
    const [subject, setSubject] = useState('');
    const [bodyHtml, setBodyHtml] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setType(initialData.type);
            setSubject(initialData.subject);
            setBodyHtml(initialData.body_html);
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const url = initialData ? `/api/admin/templates/${initialData.id}` : '/api/admin/templates';
        const method = initialData ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type, subject, body_html: bodyHtml })
            });
            if (!res.ok) throw new Error('Lưu mẫu thất bại');
            onSuccess(initialData ? 'Cập nhật mẫu thành công' : 'Tạo mẫu thành công');
        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{initialData ? 'Sửa Mẫu' : 'Tạo Mẫu Mới'}</h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Tên mẫu</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Loại</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                        >
                            <option value="marketing">Tiếp thị chung</option>
                            <option value="wishlist_sale">Thông báo giảm giá Wishlist</option>
                            <option value="order_confirm">Xác nhận đơn hàng</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-400">Chủ đề Email</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                        placeholder="vd: Chào {{customer_name}}, có tin mới nè!"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Các biến có sẵn: {'{{customer_name}}, {{product_name}}, {{discount_text}}'}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-400">Nội dung HTML</label>
                    <textarea
                        value={bodyHtml}
                        onChange={e => setBodyHtml(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-sm h-64"
                        placeholder="<html><body>...</body></html>"
                        required
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onCancel} className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded font-bold">Hủy</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold disabled:bg-gray-600">
                        {isSubmitting ? 'Đang lưu...' : 'Lưu Mẫu'}
                    </button>
                </div>
            </form>
        </div>
    );
}