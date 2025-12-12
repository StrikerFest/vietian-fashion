// components/OrderStatusBadge.js
export default function OrderStatusBadge({ status }) {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";

    switch (status?.toLowerCase()) {
        case 'paid':
            return <span className={`${baseClasses} bg-green-800 text-green-200`}>Đã thanh toán</span>;
        case 'shipped':
            return <span className={`${baseClasses} bg-blue-800 text-blue-200`}>Đã vận chuyển</span>;
        case 'delivered':
            return <span className={`${baseClasses} bg-purple-800 text-purple-200`}>Đã giao hàng</span>;
        case 'cancelled':
            return <span className={`${baseClasses} bg-red-800 text-red-200`}>Đã hủy</span>;
        case 'refunded':
            return <span className={`${baseClasses} bg-blue-800 text-blue-200`}>Đã hoàn tiền</span>;
        case 'pending':
        default:
            return <span className={`${baseClasses} bg-gray-700 text-gray-300`}>{status || 'Đang chờ xử lý'}</span>;
    }
}