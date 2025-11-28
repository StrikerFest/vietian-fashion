// app/admin/reviews/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import ReviewList from '@/components/admin/ReviewList';
import PaginationControls from '@/components/ui/PaginationControls';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function ReviewsPage() {
    const { addToast } = useToast(); // --- NEW ---
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- NEW: Pagination State ---
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchReviews = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/reviews?page=${page}&limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch reviews');

            const result = await response.json();

            if (result.data) {
                setReviews(result.data);
                setTotalItems(result.meta.total);
                setTotalPages(result.meta.totalPages);
            } else {
                setReviews(result || []);
            }
        } catch (error) {
            console.error(error);
            addToast(`Error fetching reviews: ${error.message}`, 'error'); // --- FIXED: Replaced alert() ---
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, addToast]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    // Handlers
    const handleApprove = async (reviewId) => {
        if (!confirm('Are you sure you want to approve this review?')) return;
        try {
            const response = await fetch(`/api/reviews/${reviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_approved: true }),
            });
            if (!response.ok) throw new Error('Failed to approve review');

            // Optimistic update
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_approved: true } : r));
            addToast('Review approved successfully!', 'success'); // --- FIXED: Replaced alert() ---
        } catch (error) {
            addToast(error.message, 'error'); // --- FIXED: Replaced alert() ---
        }
    };

    const handleDelete = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this review?')) return;
        try {
            const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete review');

            setReviews(prev => prev.filter(r => r.id !== reviewId));
            // Ideally refetch to update counts, but this is fine for now
            addToast('Review archived successfully!', 'success'); // --- FIXED: Replaced alert() ---
        } catch (error) {
            addToast(error.message, 'error'); // --- FIXED: Replaced alert() ---
        }
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Moderate Reviews</h1>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">All Reviews</h2>
                    <span className="text-sm text-gray-400">Total: {totalItems}</span>
                </div>

                {isLoading ? (
                    <p className="text-gray-400 text-center py-8">Loading reviews...</p>
                ) : (
                    <>
                        <ReviewList
                            reviews={reviews}
                            onApprove={handleApprove}
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
        </div>
    );
}