// components/admin/ReviewList.js
'use client';

import StarRating from '@/components/StarRating';
import { formatDate } from '@/utils/format'; // [MODIFIED] Imported

export default function ReviewList({ reviews, onApprove, onDelete }) {
    if (reviews.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">Chưa có đánh giá nào được gửi.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                <tr>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Đánh giá</th>
                    <th className="p-3">Bình luận</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Hành động</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {reviews.map(review => (
                    <tr key={review.id} className="hover:bg-gray-700/50 text-sm align-top">
                        <td className="p-3 text-gray-400 whitespace-nowrap">
                            {/* [MODIFIED] Use format util */}
                            {formatDate(review.created_at)}
                        </td>
                        <td className="p-3 font-medium text-white">
                            {review.products?.name || <span className="text-gray-500">Sản phẩm không xác định</span>}
                        </td>
                        <td className="p-3">
                            <StarRating rating={review.rating} />
                        </td>
                        <td className="p-3 text-gray-300 max-w-xs break-words">
                            {review.comment || <span className="text-gray-500 italic">Không có bình luận</span>}
                        </td>
                        <td className="p-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    review.is_approved ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'
                                }`}>
                                    {review.is_approved ? 'Đã duyệt' : 'Chờ duyệt'}
                                </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                            {!review.is_approved && (
                                <button
                                    onClick={() => onApprove(review.id)}
                                    className="text-green-400 hover:text-green-300 font-semibold"
                                >
                                    Duyệt
                                </button>
                            )}
                            <button
                                onClick={() => onDelete(review.id)}
                                className="text-red-500 hover:text-red-400 font-semibold"
                            >
                                Xóa
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}