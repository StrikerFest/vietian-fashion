// app/admin/reviews/page.js
'use client';

import { useState, useEffect } from 'react';
import ReviewList from '@/components/admin/ReviewList';

export default function ReviewsPage() {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReviews = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/reviews');
            if (!response.ok) throw new Error('Failed to fetch reviews');
            const data = await response.json();
            setReviews(data || []);
        } catch (error) {
            console.error(error);
            alert(`Error fetching reviews: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleApprove = async (reviewId) => {
        if (!confirm('Are you sure you want to approve this review?')) return;
        try {
            const response = await fetch(`/api/reviews/${reviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_approved: true }),
            });
            if (!response.ok) throw new Error('Failed to approve review');

            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_approved: true } : r));
            alert('Review approved successfully!');
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDelete = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this review?')) return;
        try {
            const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete review');

            setReviews(prev => prev.filter(r => r.id !== reviewId));
            alert('Review deleted successfully!');
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Moderate Reviews</h1>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-semibold mb-4">All Reviews</h2>
                {isLoading ? (
                    <p className="text-gray-400 text-center">Loading reviews...</p>
                ) : (
                    <ReviewList
                        reviews={reviews}
                        onApprove={handleApprove}
                        onDelete={handleDelete}
                    />
                )}
            </div>
        </div>
    );
}