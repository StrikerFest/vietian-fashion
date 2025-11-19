// app/admin/collections/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';

export default function CollectionsPage() {
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingCollection, setEditingCollection] = useState(null);

    // --- Form state ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isFeatured, setIsFeatured] = useState(false);
    // --- SEO Form State ---
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');

    // --- NEW: Search & Sort State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('name_asc'); // 'name_asc', 'name_desc', 'featured'

    // @unchanged (fetchCollections)
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

    // @unchanged (useEffect)
    useEffect(() => {
        fetchCollections();
    }, []);

    // --- NEW: Filter & Sort Logic ---
    const filteredAndSortedCollections = useMemo(() => {
        let result = [...collections];

        // 1. Filter by Search
        if (searchQuery) {
            result = result.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // 2. Sort
        result.sort((a, b) => {
            switch (sortOption) {
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                case 'featured':
                    // Featured first, then name
                    return (b.is_featured === a.is_featured) ? 0 : b.is_featured ? 1 : -1;
                case 'name_asc':
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        return result;
    }, [collections, searchQuery, sortOption]);

    // @unchanged (resetForm)
    const resetForm = () => {
        setName('');
        setDescription('');
        setIsFeatured(false);
        setSeoTitle('');
        setSeoDescription('');
        setEditingCollection(null);
    };

    // @unchanged (handleEdit)
    const handleEdit = (collection) => {
        setEditingCollection(collection);
        setName(collection.name);
        setDescription(collection.description || '');
        setIsFeatured(collection.is_featured || false);
        setSeoTitle(collection.seo_title || '');
        setSeoDescription(collection.seo_description || '');
    };

    // @unchanged (handleDelete)
    const handleDelete = async (collectionId) => {
        if (!confirm('Are you sure you want to delete this collection? This can only be done if it has no products.')) {
            return;
        }
        try {
            const response = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete collection');
            }
            fetchCollections();
            alert('Collection deleted successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // @unchanged (handleSubmit)
    const handleSubmit = async (e) => {
        e.preventDefault();
        const isEditing = !!editingCollection;
        const url = isEditing ? `/api/collections/${editingCollection.id}` : '/api/collections';
        const method = isEditing ? 'PUT' : 'POST';

        const body = {
            name,
            description,
            is_featured: isFeatured,
            seo_title: seoTitle || null,
            seo_description: seoDescription || null,
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} collection`);
            }

            resetForm();
            fetchCollections();
            alert(`Collection ${isEditing ? 'updated' : 'created'} successfully!`);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Collections</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form for adding/editing */}
                <div className="md:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4 sticky top-6">
                        <h2 className="text-xl font-semibold">{editingCollection ? 'Edit Collection' : 'Add New Collection'}</h2>
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1">Collection Name</label>
                            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500" required />
                        </div>
                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500" rows="3"></textarea>
                        </div>
                        {/* Featured Checkbox */}
                        <div className="flex items-center p-2 bg-gray-900/50 rounded border border-gray-700">
                            <input id="isFeatured" type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"/>
                            <label htmlFor="isFeatured" className="ml-2 block text-sm font-medium cursor-pointer">Feature on homepage</label>
                        </div>

                        {/* SEO Section */}
                        <div className="pt-2 border-t border-gray-700">
                            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">SEO Settings</p>
                            <div className="mb-3">
                                <label htmlFor="seoTitleCol" className="block text-xs font-medium mb-1 text-gray-300">SEO Title</label>
                                <input id="seoTitleCol" type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Max 60 chars" maxLength="70" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm" />
                            </div>
                            <div>
                                <label htmlFor="seoDescriptionCol" className="block text-xs font-medium mb-1 text-gray-300">Meta Description</label>
                                <textarea id="seoDescriptionCol" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Max 160 chars" maxLength="170" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm" rows="2"></textarea>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                {editingCollection ? 'Update' : 'Create'}
                            </button>
                            {editingCollection && (
                                <button type="button" onClick={resetForm} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List of existing collections */}
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h2 className="text-xl font-semibold">Existing Collections</h2>

                        {/* --- NEW: Search & Sort Controls --- */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-48">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="name_asc">Name (A-Z)</option>
                                <option value="name_desc">Name (Z-A)</option>
                                <option value="featured">Featured First</option>
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <p className="text-gray-400">Loading...</p>
                    ) : (
                        <div className="space-y-3">
                            {filteredAndSortedCollections.map(collection => (
                                <div key={collection.id} className="flex items-center bg-gray-900/50 p-3 rounded-md border border-gray-700 hover:border-indigo-500 transition-colors">
                                    <div className="flex-grow">
                                        <span className="font-medium text-lg">{collection.name}</span>
                                        {collection.description && (
                                            <p className="text-sm text-gray-400 truncate max-w-md">{collection.description}</p>
                                        )}
                                    </div>

                                    {collection.is_featured && (
                                        <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded-full mr-4 shadow-sm">
                                            Featured
                                        </span>
                                    )}

                                    <div className="flex gap-3 text-sm">
                                        <button onClick={() => handleEdit(collection)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                                        <button onClick={() => handleDelete(collection.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                                    </div>
                                </div>
                            ))}

                            {!isLoading && filteredAndSortedCollections.length === 0 && (
                                <p className="text-gray-500 mt-4 text-center">No collections found matching your filters.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}