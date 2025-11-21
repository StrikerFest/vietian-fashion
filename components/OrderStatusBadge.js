// components/OrderStatusBadge.js
export default function OrderStatusBadge({ status }) {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";

    switch (status?.toLowerCase()) {
        case 'paid':
            return <span className={`${baseClasses} bg-green-800 text-green-200`}>Paid</span>;
        case 'shipped':
            return <span className={`${baseClasses} bg-blue-800 text-blue-200`}>Shipped</span>;
        case 'delivered':
            return <span className={`${baseClasses} bg-purple-800 text-purple-200`}>Delivered</span>;
        case 'cancelled':
            return <span className={`${baseClasses} bg-red-800 text-red-200`}>Cancelled</span>;
        case 'refunded':
            return <span className={`${baseClasses} bg-blue-800 text-blue-200`}>Refunded</span>;
        case 'pending':
        default:
            return <span className={`${baseClasses} bg-gray-700 text-gray-300`}>{status || 'Pending'}</span>;
    }
}