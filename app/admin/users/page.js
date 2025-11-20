// app/admin/users/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();
            setUsers(data || []);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleArchive = async (userId) => {
        if (!confirm('Are you sure you want to archive this user? They will no longer be able to log in.')) return;
        try {
            const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to archive user');
            setUsers(users.filter(u => u.id !== userId));
        } catch (error) {
            alert(error.message);
        }
    };

    const filteredUsers = users.filter(user => {
        const term = searchQuery.toLowerCase();
        const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(term) || email.includes(term);
    });

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Customers</h1>

            <div className="bg-gray-800 p-6 rounded-lg">
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search customers by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full md:w-1/3 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {isLoading ? <p>Loading customers...</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Orders</th>
                                <th className="p-3">Joined</th>
                                <th className="p-3">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-sm">
                                    <td className="p-3 font-mono text-gray-400">#{user.id}</td>
                                    <td className="p-3 font-medium">{user.first_name} {user.last_name || ''}</td>
                                    <td className="p-3">{user.email || 'N/A'}</td>
                                    <td className="p-3">
                                            <span className="bg-gray-700 px-2 py-1 rounded-full text-xs">
                                                {user.order_count}
                                            </span>
                                    </td>
                                    <td className="p-3">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 flex gap-3">
                                        <Link href={`/admin/users/${user.id}`} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                                            View
                                        </Link>
                                        <button
                                            onClick={() => handleArchive(user.id)}
                                            className="text-red-500 hover:text-red-400 font-semibold"
                                        >
                                            Archive
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan="6" className="p-4 text-center text-gray-500">No customers found.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}