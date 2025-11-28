// components/admin/DiscountForm.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function DiscountForm({ initialData, onSuccess, onCancel }) {
    const { addToast } = useToast(); // --- NEW ---
    const [code, setCode] = useState('');
    const [type, setType] = useState('percentage');
    const [value, setValue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setCode(initialData.code);
            setType(initialData.type);
            setValue(initialData.value);
            // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
            setStartDate(initialData.start_date ? new Date(initialData.start_date).toISOString().slice(0, 16) : '');
            setEndDate(initialData.end_date ? new Date(initialData.end_date).toISOString().slice(0, 16) : '');
            setIsActive(initialData.is_active);
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!code || !type || value === '') {
            addToast('Please fill in Code, Type, and Value.', 'error'); // --- FIXED: Replaced alert() ---
            return;
        }
        if (type === 'percentage' && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
            addToast('Percentage value must be between 0 and 100.', 'error'); // --- FIXED: Replaced alert() ---
            return;
        }
        if (type === 'fixed' && parseFloat(value) < 0) {
            addToast('Fixed value cannot be negative.', 'error'); // --- FIXED: Replaced alert() ---
            return;
        }

        setIsSubmitting(true);
        const isEditing = !!initialData;
        const url = isEditing ? `/api/discounts/${initialData.id}` : '/api/discounts';
        const method = isEditing ? 'PUT' : 'POST';

        const body = {
            code,
            type,
            value: parseFloat(value),
            start_date: startDate ? new Date(startDate).toISOString() : null,
            end_date: endDate ? new Date(endDate).toISOString() : null,
            is_active: isActive,
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Operation failed');
            }

            onSuccess(isEditing ? 'Discount updated!' : 'Discount created!');
        } catch (error) {
            addToast(`Error: ${error.message}`, 'error'); // --- FIXED: Replaced alert() ---
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">{initialData ? 'Edit Discount' : 'Add New Discount'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="code" className="block text-sm font-medium mb-1">Discount Code</label>
                    <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. SUMMER2025"
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium mb-1">Type</label>
                        <select
                            id="type"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                            required
                        >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount ($)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="value" className="block text-sm font-medium mb-1">Value</label>
                        <input
                            id="value"
                            type="number"
                            step={type === 'percentage' ? "1" : "0.01"}
                            min="0"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="start_date" className="block text-sm font-medium mb-1">Start Date (Optional)</label>
                        <input
                            id="start_date"
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="end_date" className="block text-sm font-medium mb-1">End Date (Optional)</label>
                        <input
                            id="end_date"
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || ''}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-white"
                        />
                    </div>
                </div>
                <div className="flex items-center pt-2 p-3 bg-gray-900/50 rounded border border-gray-700">
                    <input
                        id="is_active"
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm font-medium cursor-pointer">Is Active</label>
                </div>
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600"
                    >
                        {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Save')}
                    </button>
                </div>
            </form>
        </div>
    );
}