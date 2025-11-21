// components/admin/ReviewList.js
'use client';

import StarRating from '@/components/StarRating';

export default function ReviewList({ reviews, onApprove, onDelete }) {
    if (reviews.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">No reviews submitted yet.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Comment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {reviews.map(review => (
                    <tr key={review.id} className="hover:bg-gray-700/50 text-sm align-top">
                        <td className="p-3 text-gray-400 whitespace-nowrap">
                            {new Date(review.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-medium text-white">
                            {review.products?.name || <span className="text-gray-500">Unknown Product</span>}
                        </td>
                        <td className="p-3">
                            <StarRating rating={review.rating} />
                        </td>
                        <td className="p-3 text-gray-300 max-w-xs break-words">
                            {review.comment || <span className="text-gray-500 italic">No comment</span>}
                        </td>
                        <td className="p-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    review.is_approved ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'
                                }`}>
                                    {review.is_approved ? 'Approved' : 'Pending'}
                                </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                            {!review.is_approved && (
                                <button
                                    onClick={() => onApprove(review.id)}
                                    className="text-green-400 hover:text-green-300 font-semibold"
                                >
                                    Approve
                                </button>
                            )}
                            <button
                                onClick={() => onDelete(review.id)}
                                className="text-red-500 hover:text-red-400 font-semibold"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}