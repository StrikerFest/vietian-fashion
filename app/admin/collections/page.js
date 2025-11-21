// app/admin/collections/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import CollectionForm from '@/components/admin/CollectionForm';
import CollectionList from '@/components/admin/CollectionList';

export default function CollectionsPage() {
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('name_asc');

    const fetchCollections = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/collections');
            const data = await response.json();
            setCollections(data || []);
        } catch (error) {
            console.error("Failed to fetch collections:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    // Filter & Sort
    const filteredAndSortedCollections = useMemo(() => {
        let result = [...collections];

        if (searchQuery) {
            result = result.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        result.sort((a, b) => {
            switch (sortOption) {
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'featured': return (b.is_featured === a.is_featured) ? 0 : b.is_featured ? 1 : -1;
                case 'name_asc': default: return a.name.localeCompare(b.name);
            }
        });

        return result;
    }, [collections, searchQuery, sortOption]);

    const handleDelete = async (collectionId) => {
        if (!confirm('Are you sure you want to delete this collection?')) return;
        try {
            const response = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete collection');

            setCollections(prev => prev.filter(c => c.id !== collectionId));
            alert('Collection deleted successfully!');
        } catch (error) {
            alert(error.message);
        }
    };

    const handleEdit = (collection) => {
        setEditingCollection(collection);
        setShowForm(true);
    };

    const handleFormSuccess = (message) => {
        alert(message);
        setShowForm(false);
        setEditingCollection(null);
        fetchCollections();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Collections</h1>

            {/* Actions Bar */}
            {!showForm && (
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <button
                        onClick={() => { setEditingCollection(null); setShowForm(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Add New Collection
                    </button>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-48">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
                        </div>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="name_asc">Name (A-Z)</option>
                            <option value="name_desc">Name (Z-A)</option>
                            <option value="featured">Featured First</option>
                        </select>
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
                            <CollectionList
                                collections={filteredAndSortedCollections}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}