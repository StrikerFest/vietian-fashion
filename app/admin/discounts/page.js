// app/admin/discounts/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import DiscountForm from '@/components/admin/DiscountForm';
import DiscountList from '@/components/admin/DiscountList';
import PaginationControls from '@/components/ui/PaginationControls'; // --- NEW ---

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);

    // --- NEW: Pagination State ---
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchDiscounts = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/discounts?page=${page}&limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch discounts');

            const result = await response.json();

            if (result.data) {
                setDiscounts(result.data);
                setTotalItems(result.meta.total);
                setTotalPages(result.meta.totalPages);
            } else {
                setDiscounts(result || []);
            }
        } catch (error) {
            console.error("Failed to fetch discounts:", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchDiscounts();
    }, [fetchDiscounts]);

    const handleDelete = async (discountId) => {
        if (!confirm('Are you sure you want to delete this discount?')) return;

        try {
            const response = await fetch(`/api/discounts/${discountId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete discount');
            }
            fetchDiscounts(); // Reload
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

    // Pagination handlers
    const handlePageChange = (newPage) => setPage(newPage);
    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Discounts</h1>

            {!showForm && (
                <div className="mb-6 flex justify-between items-center">
                    <button
                        onClick={() => { setEditingDiscount(null); setShowForm(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Add New Discount
                    </button>
                    <span className="text-sm text-gray-400">Total: {totalItems}</span>
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
                            <>
                                <DiscountList
                                    discounts={discounts}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                                <PaginationControls
                                    currentPage={page}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    limit={limit}
                                    onPageChange={handlePageChange}
                                    onLimitChange={handleLimitChange}
                                    isLoading={isLoading}
                                />
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}