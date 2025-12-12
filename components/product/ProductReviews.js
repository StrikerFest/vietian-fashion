// components/product/ProductReviews.js
'use client';

import { useState, useEffect } from 'react';
import StarRating from '@/components/StarRating'; // Reuse the admin component

// Internal helper for input
function StarRatingInput({ rating, setRating }) {
    return (
        <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((starValue) => (
                <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    className={`text-2xl transition-colors focus:outline-none ${
                        starValue <= rating ? 'text-yellow-400 scale-110' : 'text-gray-600 hover:text-yellow-600'
                    }`}
                >
                    ★
                </button>
            ))}
        </div>
    );
}

export default function ProductReviews({ productId }) {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Fetch Reviews
    useEffect(() => {
        const fetchReviews = async () => {
            if (!productId) return;
            setIsLoading(true);
            try {
                const response = await fetch(`/api/reviews/product/${productId}`);
                if (response.ok) {
                    const data = await response.json();
                    setReviews(data || []);
                }
            } catch (error) {
                console.error("Failed to fetch reviews", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReviews();
    }, [productId]);

    // Submit Review
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setMessage({ type: 'error', text: 'Vui lòng chọn xếp hạng sao.' });
            return;
        }
        setIsSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: Number(productId),
                    rating,
                    comment,
                    user_id: null // Anonymous for now, or pass user if authenticated
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gửi đánh giá thất bại');

            setMessage({ type: 'success', text: 'Đã gửi đánh giá! Đang chờ kiểm duyệt.' });
            setRating(0);
            setComment('');
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-16 pt-10 border-t border-gray-700">
            <h2 className="text-2xl font-bold mb-8 text-white">Đánh giá của khách hàng</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Review Form */}
                <div className="bg-gray-800 p-6 rounded-lg h-fit border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 text-white">Viết đánh giá</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-400">Xếp hạng</label>
                            <StarRatingInput rating={rating} setRating={setRating} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-400">Bình luận</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows="4"
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="Chia sẻ suy nghĩ của bạn..."
                            ></textarea>
                        </div>

                        {message.text && (
                            <div className={`text-sm p-2 rounded ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors disabled:bg-gray-600"
                        >
                            {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                    </form>
                </div>

                {/* Reviews List */}
                <div className="space-y-6">
                    {isLoading ? (
                        <p className="text-gray-400">Đang tải đánh giá...</p>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-10 bg-gray-800/50 rounded-lg border border-gray-700 border-dashed">
                            <p className="text-gray-400">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</p>
                        </div>
                    ) : (
                        reviews.map(review => (
                            <div key={review.id} className="border-b border-gray-700 pb-6 last:border-0">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                                            U
                                        </div>
                                        <div>
                                            <StarRating rating={review.rating} />
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mt-3">
                                    {review.comment || <span className="italic text-gray-600">Không có bình luận bằng lời.</span>}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}