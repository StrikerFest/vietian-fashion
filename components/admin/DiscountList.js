// components/admin/DiscountList.js
'use client';

export default function DiscountList({ discounts, onEdit, onDelete }) {

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    if (discounts.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">No discounts created yet.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Value</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Starts</th>
                    <th className="p-3">Ends</th>
                    <th className="p-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {discounts.map(discount => (
                    <tr key={discount.id} className="hover:bg-gray-700/50 text-sm">
                        <td className="p-3 font-mono font-semibold text-white">{discount.code}</td>
                        <td className="p-3 capitalize text-gray-300">{discount.type}</td>
                        <td className="p-3 text-white">
                            {discount.type === 'percentage' ? `${discount.value}%` : `$${Number(discount.value).toFixed(2)}`}
                        </td>
                        <td className="p-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    discount.is_active ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                                }`}>
                                    {discount.is_active ? 'Active' : 'Inactive'}
                                </span>
                        </td>
                        <td className="p-3 text-gray-400">{formatDate(discount.start_date)}</td>
                        <td className="p-3 text-gray-400">{formatDate(discount.end_date)}</td>
                        <td className="p-3 text-right space-x-3">
                            <button
                                onClick={() => onEdit(discount)}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => onDelete(discount.id)}
                                className="text-red-500 hover:text-red-400 font-semibold transition-colors"
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