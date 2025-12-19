// components/admin/DiscountForm.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function DiscountForm({ initialData, onSuccess, onCancel }) {
    const { addToast } = useToast();

    // --- State ---
    const [code, setCode] = useState('');
    const [type, setType] = useState('percentage'); // 'percentage' or 'fixed'
    const [value, setValue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Load Initial Data ---
    useEffect(() => {
        if (initialData) {
            setCode(initialData.code);
            setType(initialData.type);
            setValue(initialData.value);

            // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
            if (initialData.start_date) {
                setStartDate(new Date(initialData.start_date).toISOString().slice(0, 16));
            }
            if (initialData.end_date) {
                setEndDate(new Date(initialData.end_date).toISOString().slice(0, 16));
            }

            setIsActive(initialData.is_active);
        }
    }, [initialData]);

    // --- Submit Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Basic Validation
        if (!code || !value || !startDate) {
            addToast('Vui lòng điền đầy đủ các trường bắt buộc.', 'error');
            setIsSubmitting(false);
            return;
        }

        try {
            const payload = {
                code: code.toUpperCase(),
                type,
                value: parseFloat(value),
                start_date: new Date(startDate).toISOString(),
                end_date: endDate ? new Date(endDate).toISOString() : null,
                is_active: isActive
            };

            const url = initialData ? `/api/discounts/${initialData.id}` : '/api/discounts';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Có lỗi xảy ra.');
            }

            addToast(initialData ? 'Cập nhật mã giảm giá thành công!' : 'Tạo mã giảm giá thành công!', 'success');
            onSuccess();
        } catch (error) {
            console.error(error);
            addToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-6">
                {initialData ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Code & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Mã Code (VD: SALE50)</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="w-full bg-gray-700 p-2 rounded text-white border border-gray-600 focus:border-indigo-500 outline-none uppercase"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Loại giảm giá</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded text-white border border-gray-600 focus:border-indigo-500 outline-none"
                        >
                            <option value="percentage">Phần trăm (%)</option>
                            <option value="fixed">Số tiền cố định (₫)</option>
                        </select>
                    </div>
                </div>

                {/* Value */}
                <div>
                    <label className="block text-sm text-gray-400 mb-1">
                        Giá trị {type === 'percentage' ? '(%)' : '(₫)'}
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded text-white border border-gray-600 focus:border-indigo-500 outline-none"
                        required
                    />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Ngày bắt đầu</label>
                        <input
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded text-white border border-gray-600 focus:border-indigo-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Ngày kết thúc (Tùy chọn)</label>
                        <input
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded text-white border border-gray-600 focus:border-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center pt-2 p-3 bg-gray-900/50 rounded border border-gray-700">
                    <input
                        id="is_active"
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm font-medium cursor-pointer text-gray-300">
                        Kích hoạt mã này
                    </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Tạo mã')}
                    </button>
                </div>
            </form>
        </div>
    );
}