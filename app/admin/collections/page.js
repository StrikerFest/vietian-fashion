// app/admin/collections/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import CollectionForm from '@/components/admin/CollectionForm';
import CollectionList from '@/components/admin/CollectionList';
import PaginationControls from '@/components/ui/PaginationControls';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function CollectionsPage() {
    const { addToast } = useToast(); // --- NEW ---
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');

    // --- NEW: Pagination State ---
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchCollections = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: searchQuery
            });

            const response = await fetch(`/api/collections?${params.toString()}`);
            const result = await response.json();

            if (result.data) {
                setCollections(result.data);
                setTotalItems(result.meta.total);
                setTotalPages(result.meta.totalPages);
            } else {
                setCollections(result || []);
            }
        } catch (error) {
            console.error("Failed to fetch collections:", error);
            addToast("Failed to load collections.", 'error'); // Fallback for fetch error
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, searchQuery, addToast]);

    // Debounce search
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchCollections();
        }, 500);
        return () => clearTimeout(timeout);
    }, [fetchCollections]);

    const handleDelete = async (collectionId) => {
        if (!confirm('Are you sure you want to delete this collection?')) return;
        try {
            const response = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete collection');

            fetchCollections(); // Reload
            addToast('Collection archived successfully!', 'success'); // --- FIXED: Replaced alert() ---
        } catch (error) {
            addToast(error.message, 'error'); // --- FIXED: Replaced alert() ---
        }
    };

    const handleEdit = (collection) => {
        setEditingCollection(collection);
        setShowForm(true);
    };

    const handleFormSuccess = (message) => {
        addToast(message, 'success'); // --- FIXED: Replaced alert() ---
        setShowForm(false);
        setEditingCollection(null);
        fetchCollections();
    };

    // Pagination handlers
    const handlePageChange = (newPage) => setPage(newPage);
    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Collections</h1>

            {!showForm && (
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <button
                        onClick={() => { setEditingCollection(null); setShowForm(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Add New Collection
                    </button>

                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {showForm ? (
                    <div className="max-w-2xl">
                        <CollectionForm
                            initialData={editingCollection}
                            onSuccess={handleFormSuccess}
                            onCancel={() => { setShowForm(false); setEditingCollection(null); }}
                        />
                    </div>
                ) : (
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        {isLoading ? (
                            <p className="text-gray-400 text-center">Loading collections...</p>
                        ) : (
                            <>
                                <CollectionList
                                    collections={collections}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
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
                )}
            </div>
        </div>
    );
}