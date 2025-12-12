// app/admin/reviews/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import ReviewList from '@/components/admin/ReviewList';
import PaginationControls from '@/components/ui/PaginationControls';
import { useToast } from '@/context/ToastContext';

export default function ReviewsPage() {
    const { addToast } = useToast();
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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
            addToast(`Lỗi khi tải đánh giá: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, addToast]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleApprove = async (reviewId) => {
        if (!confirm('Bạn có chắc chắn muốn duyệt đánh giá này?')) return;
        try {
            const response = await fetch(`/api/reviews/${reviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_approved: true }),
            });
            if (!response.ok) throw new Error('Failed to approve review');

            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_approved: true } : r));
            addToast('Duyệt đánh giá thành công!', 'success');
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handleDelete = async (reviewId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
        try {
            const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete review');

            setReviews(prev => prev.filter(r => r.id !== reviewId));
            addToast('Đánh giá đã được lưu trữ thành công!', 'success');
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Kiểm Duyệt Đánh Giá</h1>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Tất cả đánh giá</h2>
                    <span className="text-sm text-gray-400">Tổng: {totalItems}</span>
                </div>

                {isLoading ? (
                    <p className="text-gray-400 text-center py-8">Đang tải đánh giá...</p>
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