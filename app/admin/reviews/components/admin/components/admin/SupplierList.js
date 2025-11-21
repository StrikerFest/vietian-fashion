// components/admin/SupplierList.js
'use client';

export default function SupplierList({ suppliers, onEdit, onDelete }) {
    if (suppliers.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">No suppliers added yet.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {suppliers.map(supplier => (
                    <tr key={supplier.id} className="hover:bg-gray-700/50 text-sm">
                        <td className="p-3 font-medium text-white">{supplier.name}</td>
                        <td className="p-3 text-gray-300">{supplier.contact_person || '-'}</td>
                        <td className="p-3 text-gray-300">{supplier.email || '-'}</td>
                        <td className="p-3 text-gray-300">{supplier.phone || '-'}</td>
                        <td className="p-3 text-right space-x-2">
                            <button
                                onClick={() => onEdit(supplier)}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => onDelete(supplier.id)}
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