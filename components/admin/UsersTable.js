// components/admin/UsersTable.js
'use client';

import Link from 'next/link';

export default function UsersTable({ users, onArchive }) {
    if (users.length === 0) {
        return <div className="p-8 text-center text-gray-500">No customers found.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-900 text-gray-300 border-b border-gray-700">
                <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Orders</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-700/50 text-sm">
                        <td className="p-3 font-mono text-gray-400">#{user.id}</td>
                        <td className="p-3 font-medium text-white">
                            {user.first_name} {user.last_name || ''}
                        </td>
                        <td className="p-3 text-gray-300">{user.email || 'N/A'}</td>
                        <td className="p-3">
                                <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs">
                                    {user.order_count}
                                </span>
                        </td>
                        <td className="p-3 text-gray-300">
                            {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-3">
                            <Link
                                href={`/admin/users/${user.id}`}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                            >
                                View
                            </Link>
                            <button
                                onClick={() => onArchive(user.id)}
                                className="text-red-500 hover:text-red-400 font-semibold transition-colors"
                            >
                                Archive
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}