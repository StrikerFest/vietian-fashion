// components/admin/ReturnList.js
'use client';

export default function ReturnList({ requests, onView }) {
    const getStatusBadge = (status) => {
        const base = "px-2 py-1 text-xs font-semibold rounded-full";
        switch (status) {
            case 'approved': return <span className={`${base} bg-green-900 text-green-200`}>Approved</span>;
            case 'rejected': return <span className={`${base} bg-red-900 text-red-200`}>Rejected</span>;
            default: return <span className={`${base} bg-yellow-900 text-yellow-200`}>Pending</span>;
        }
    };

    if (requests.length === 0) return <p className="text-gray-500 text-center mt-4">No requests found.</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Order</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-700/50 text-sm">
                        <td className="p-3 font-mono text-indigo-400">#{req.id}</td>
                        <td className="p-3 text-gray-300">{new Date(req.created_at).toLocaleDateString()}</td>
                        <td className="p-3 font-mono">#{req.order_id}</td>
                        <td className="p-3 font-medium text-white">{req.users?.email || 'Guest'}</td>
                        <td className="p-3 text-gray-300">{req.return_items?.reduce((sum, i) => sum + i.quantity, 0)}</td>
                        <td className="p-3">{getStatusBadge(req.status)}</td>
                        <td className="p-3 text-right">
                            <button onClick={() => onView(req)} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                                View
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}