// app/admin/users/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import UsersTable from '@/components/admin/UsersTable';
import PaginationControls from '@/components/ui/PaginationControls'; // --- NEW ---

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // --- NEW: Pagination State ---
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: searchQuery
            });

            const response = await fetch(`/api/admin/users?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to load users');

            const result = await response.json();

            if (result.data) {
                setUsers(result.data);
                setTotalItems(result.meta.total);
                setTotalPages(result.meta.totalPages);
            } else {
                setUsers(result || []);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, searchQuery]);

    // Debounce search
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timeout);
    }, [fetchUsers]);

    const handleArchive = async (userId) => {
        if (!confirm('Are you sure you want to archive this user? They will no longer be able to log in.')) return;

        try {
            const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to archive user');

            fetchUsers(); // Reload to update list/counts
            alert('User archived successfully.');
        } catch (error) {
            alert(error.message);
        }
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Customers</h1>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <div className="relative max-w-md w-full">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1); // Reset page on search
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <svg className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <span className="text-sm text-gray-400 ml-4 whitespace-nowrap">Total Users: {totalItems}</span>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-gray-400">Loading customers...</div>
                ) : (
                    <>
                        <UsersTable users={users} onArchive={handleArchive} />
                        <PaginationControls
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            limit={limit}
                            onPageChange={handlePageChange}
                            onLimitChange={handleLimitChange}
                            isLoading={isLoading}
                        />
                    </>
                )}
            </div>
        </div>
    );
}