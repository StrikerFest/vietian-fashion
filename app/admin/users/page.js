// app/admin/users/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import UsersTable from '@/components/admin/UsersTable';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/users');
            if (!response.ok) throw new Error('Failed to load users');
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

            setUsers(prev => prev.filter(u => u.id !== userId));
            alert('User archived successfully.');
        } catch (error) {
            alert(error.message);
        }
    };

    const filteredUsers = useMemo(() => {
        const term = searchQuery.toLowerCase();
        return users.filter(user => {
            const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
            const email = (user.email || '').toLowerCase();
            const id = (user.id || '').toString();
            return name.includes(term) || email.includes(term) || id.includes(term);
        });
    }, [users, searchQuery]);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Customers</h1>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                {/* Search Bar */}
                <div className="mb-6 relative max-w-md">
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <svg className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="text-center py-12 text-gray-400">Loading customers...</div>
                ) : (
                    <UsersTable users={filteredUsers} onArchive={handleArchive} />
                )}
            </div>
        </div>
    );
}