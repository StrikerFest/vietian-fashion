// app/admin/discounts/page.js
'use client';

import { useState, useEffect } from 'react';

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingDiscount, setEditingDiscount] = useState(null);

    // Form state based on the discounts table schema
    const [code, setCode] = useState('');
    const [type, setType] = useState('percentage'); // Default type
    const [value, setValue] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isActive, setIsActive] = useState(true);

    const fetchDiscounts = async () => {
        setIsLoading(true);
        try {
            // We'll create this API endpoint next
            const response = await fetch('/api/discounts');
            if (!response.ok) throw new Error('Failed to fetch discounts');
            const data = await response.json();
            setDiscounts(data || []);
        } catch (error) {
            console.error("Failed to fetch discounts:", error);
            alert(`Error fetching discounts: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const resetForm = () => {
        setCode('');
        setType('percentage');
        setValue('');
        setStartDate('');
        setEndDate('');
        setIsActive(true);
        setEditingDiscount(null);
    };

    const handleEdit = (discount) => {
        setEditingDiscount(discount);
        setCode(discount.code);
        setType(discount.type);
        setValue(discount.value);
        // Format dates for input type="datetime-local" which expects 'YYYY-MM-DDTHH:mm'
        setStartDate(discount.start_date ? new Date(discount.start_date).toISOString().slice(0, 16) : '');
        setEndDate(discount.end_date ? new Date(discount.end_date).toISOString().slice(0, 16) : '');
        setIsActive(discount.is_active);
    };

    const handleDelete = async (discountId) => {
        if (!confirm('Are you sure you want to delete this discount?')) {
            return;
        }
        try {
            // We'll create this API endpoint next
            const response = await fetch(`/api/discounts/${discountId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete discount');
            }
            fetchDiscounts(); // Refetch to update the list
            alert('Discount deleted successfully!');
        } catch (error) {
            alert(`Error deleting discount: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isEditing = !!editingDiscount;
        const url = isEditing ? `/api/discounts/${editingDiscount.id}` : '/api/discounts';
        const method = isEditing ? 'PUT' : 'POST';

        // Basic validation
        if (!code || !type || value === '') {
            alert('Please fill in Code, Type, and Value.');
            return;
        }
        if (type === 'percentage' && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
            alert('Percentage value must be between 0 and 100.');
            return;
        }
        if (type === 'fixed' && parseFloat(value) < 0) {
            alert('Fixed value cannot be negative.');
            return;
        }

        const body = {
            code,
            type,
            value: parseFloat(value),
            start_date: startDate ? new Date(startDate).toISOString() : null, // Store as ISO string
            end_date: endDate ? new Date(endDate).toISOString() : null, // Store as ISO string
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
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} discount`);
            }

            resetForm();
            fetchDiscounts(); // Refetch the list to show changes
            alert(`Discount ${isEditing ? 'updated' : 'created'} successfully!`);
        } catch (error) {
            alert(`Error saving discount: ${error.message}`);
        }
    };

    // Helper to format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Discounts</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form for adding/editing */}
                <div className="md:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4">
                        <h2 className="text-xl font-semibold">{editingDiscount ? 'Edit Discount' : 'Add New Discount'}</h2>
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium mb-1">Discount Code</label>
                            <input
                                id="code"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())} // Often codes are uppercase
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
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
                                    className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
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
                                    className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="start_date" className="block text-sm font-medium mb-1">Start Date (Optional)</label>
                            <input
                                id="start_date"
                                type="datetime-local" // Use datetime-local for date and time
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-gray-300"
                            />
                        </div>
                        <div>
                            <label htmlFor="end_date" className="block text-sm font-medium mb-1">End Date (Optional)</label>
                            <input
                                id="end_date"
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate || ''} // End date cannot be before start date
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-gray-300"
                            />
                        </div>
                        <div className="flex items-center pt-2">
                            <input
                                id="is_active"
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="is_active" className="ml-2 block text-sm">Is Active</label>
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
                                {editingDiscount ? 'Update Discount' : 'Save Discount'}
                            </button>
                            {editingDiscount && (
                                <button type="button" onClick={resetForm} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List of existing discounts */}
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Existing Discounts</h2>
                    {isLoading ? <p>Loading discounts...</p> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900">
                                <tr>
                                    <th className="p-3">Code</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Value</th>
                                    <th className="p-3">Active</th>
                                    <th className="p-3">Starts</th>
                                    <th className="p-3">Ends</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {discounts.map(discount => (
                                    <tr key={discount.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-sm">
                                        <td className="p-3 font-mono font-semibold">{discount.code}</td>
                                        <td className="p-3 capitalize">{discount.type}</td>
                                        <td className="p-3">
                                            {discount.type === 'percentage' ? `${discount.value}%` : `$${Number(discount.value).toFixed(2)}`}
                                        </td>
                                        <td className="p-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    discount.is_active ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
                                                }`}>
                                                    {discount.is_active ? 'Yes' : 'No'}
                                                </span>
                                        </td>
                                        <td className="p-3">{formatDate(discount.start_date)}</td>
                                        <td className="p-3">{formatDate(discount.end_date)}</td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={() => handleEdit(discount)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                                            <button onClick={() => handleDelete(discount.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    { !isLoading && discounts.length === 0 && <p className="text-gray-500 mt-4 text-center">No discounts created yet.</p>}
                </div>
            </div>
        </div>
    );
}