// app/admin/reviews/page.js
'use client';

import { useState, useEffect } from 'react';

// Simple Star Rating Display Component
function StarRating({ rating }) {
    const totalStars = 5;
    let stars = [];
    for (let i = 1; i <= totalStars; i++) {
        stars.push(
            <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-600'}>
                ★
            </span>
        );
    }
    return <div className="flex">{stars}</div>;
}


export default function ReviewsPage() {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReviews = async () => {
        setIsLoading(true);
        try {
            // Fetch all reviews using the endpoint created earlier
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
            // Call the PUT endpoint to approve
            const response = await fetch(`/api/reviews/${reviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_approved: true }), // Send approval status
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to approve review');
            }
            // Update the local state to reflect the change immediately
            setReviews(prevReviews =>
                prevReviews.map(review =>
                    review.id === reviewId ? { ...review, is_approved: true } : review
                )
            );
            alert('Review approved successfully!');
        } catch (error) {
            alert(`Error approving review: ${error.message}`);
        }
    };

    const handleDelete = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this review?')) return;
        try {
            // Call the DELETE endpoint
            const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete review');
            }
            // Remove the review from local state
            setReviews(prevReviews => prevReviews.filter(review => review.id !== reviewId));
            alert('Review deleted successfully!');
        } catch (error) {
            alert(`Error deleting review: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Moderate Reviews</h1>

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Pending & Approved Reviews</h2>
                {isLoading ? (
                    <p>Loading reviews...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Product</th>
                                <th className="p-3">Rating</th>
                                <th className="p-3">Comment</th>
                                {/* Optional: Add User column if fetching user data */}
                                <th className="p-3">Status</th>
                                <th className="p-3">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {reviews.map(review => (
                                <tr key={review.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-sm align-top">
                                    <td className="p-3 whitespace-nowrap">{new Date(review.created_at).toLocaleDateString()}</td>
                                    <td className="p-3">{review.products?.name || `(Product ID: ${review.product_id})`}</td>
                                    <td className="p-3"><StarRating rating={review.rating} /></td>
                                    <td className="p-3 max-w-sm break-words">{review.comment || <span className="text-gray-500 italic">No comment</span>}</td>
                                    {/* Optional User Cell: <td className="p-3">{review.users?.email || 'Anonymous'}</td> */}
                                    <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                review.is_approved ? 'bg-green-800 text-green-200' : 'bg-yellow-800 text-yellow-200'
                                            }`}>
                                                {review.is_approved ? 'Approved' : 'Pending'}
                                            </span>
                                    </td>
                                    <td className="p-3 flex flex-col sm:flex-row gap-2">
                                        {!review.is_approved && (
                                            <button
                                                onClick={() => handleApprove(review.id)}
                                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded text-xs whitespace-nowrap"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(review.id)}
                                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded text-xs whitespace-nowrap"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        { !isLoading && reviews.length === 0 && <p className="text-gray-500 mt-4 text-center">No reviews submitted yet.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}