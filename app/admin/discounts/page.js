// app/admin/discounts/page.js
'use client';

import { useState, useEffect } from 'react';
import DiscountForm from '@/components/admin/DiscountForm';
import DiscountList from '@/components/admin/DiscountList';

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);

    const fetchDiscounts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/discounts');
            if (!response.ok) throw new Error('Failed to fetch discounts');
            const data = await response.json();
            setDiscounts(data || []);
        } catch (error) {
            console.error("Failed to fetch discounts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const handleDelete = async (discountId) => {
        if (!confirm('Are you sure you want to delete this discount?')) return;

        try {
            const response = await fetch(`/api/discounts/${discountId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete discount');
            }
            // Optimistic update
            setDiscounts(prev => prev.filter(d => d.id !== discountId));
            alert('Discount deleted successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleEdit = (discount) => {
        setEditingDiscount(discount);
        setShowForm(true);
    };

    const handleFormSuccess = (message) => {
        alert(message);
        setShowForm(false);
        setEditingDiscount(null);
        fetchDiscounts();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Discounts</h1>

            {!showForm && (
                <div className="mb-6">
                    <button
                        onClick={() => { setEditingDiscount(null); setShowForm(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Add New Discount
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {showForm ? (
                    <div className="max-w-2xl">
                        <DiscountForm
                            initialData={editingDiscount}
                            onSuccess={handleFormSuccess}
                            onCancel={() => { setShowForm(false); setEditingDiscount(null); }}
                        />
                    </div>
                ) : (
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        {isLoading ? (
                            <p className="text-gray-400 text-center">Loading discounts...</p>
                        ) : (
                            <DiscountList
                                discounts={discounts}
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