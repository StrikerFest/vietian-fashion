// app/admin/collections/page.js
'use client';

import { useState, useEffect } from 'react';

export default function CollectionsPage() {
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingCollection, setEditingCollection] = useState(null);

    // --- Form state ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isFeatured, setIsFeatured] = useState(false);
    // --- NEW: SEO Form State ---
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');

    // @unchanged (fetchCollections remains the same)
    const fetchCollections = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/collections'); //
            const data = await response.json();
            setCollections(data || []);
        } catch (error) {
            console.error("Failed to fetch collections:", error);
        }
        setIsLoading(false);
    };

    // @unchanged (useEffect remains the same)
    useEffect(() => {
        fetchCollections();
    }, []);

    const resetForm = () => {
        setName('');
        setDescription('');
        setIsFeatured(false);
        // --- NEW: Reset SEO fields ---
        setSeoTitle('');
        setSeoDescription('');
        setEditingCollection(null);
    };

    const handleEdit = (collection) => {
        setEditingCollection(collection);
        setName(collection.name);
        setDescription(collection.description || '');
        setIsFeatured(collection.is_featured || false);
        // --- NEW: Populate SEO fields ---
        // Assumes DB columns are added and API returns them
        setSeoTitle(collection.seo_title || '');
        setSeoDescription(collection.seo_description || '');
    };

    // @unchanged (handleDelete remains the same)
    const handleDelete = async (collectionId) => {
        if (!confirm('Are you sure you want to delete this collection? This can only be done if it has no products.')) {
            return;
        }
        try {
            const response = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' }); ///route.js]
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete collection');
            }
            fetchCollections(); // Refetch to update the list
            alert('Collection deleted successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isEditing = !!editingCollection;
        const url = isEditing ? `/api/collections/${editingCollection.id}` : '/api/collections'; ///route.js]
        const method = isEditing ? 'PUT' : 'POST';

        const body = {
            name,
            description,
            is_featured: isFeatured,
            // --- NEW: Include SEO fields ---
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
            fetchCollections(); // Refetch the list to show changes
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
                    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4">
                        <h2 className="text-xl font-semibold">{editingCollection ? 'Edit Collection' : 'Add New Collection'}</h2>
                        {/* @unchanged (Name, Description, Is Featured inputs) */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1">Collection Name</label>
                            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600" required />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600" rows="3"></textarea>
                        </div>
                        <div className="flex items-center">
                            <input id="isFeatured" type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"/>
                            <label htmlFor="isFeatured" className="ml-2 block text-sm">Feature on homepage</label>
                        </div>

                         {/* --- NEW: SEO Fields --- */}
                         <div>
                            <label htmlFor="seoTitleCol" className="block text-sm font-medium mb-1">SEO Title (Optional)</label>
                            <input
                                id="seoTitleCol" // Use unique ID if needed
                                type="text"
                                value={seoTitle}
                                onChange={(e) => setSeoTitle(e.target.value)}
                                placeholder="Max 60 characters recommended"
                                maxLength="70"
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
                            />
                        </div>
                        <div>
                            <label htmlFor="seoDescriptionCol" className="block text-sm font-medium mb-1">SEO Meta Description (Optional)</label>
                            <textarea
                                id="seoDescriptionCol" // Use unique ID if needed
                                value={seoDescription}
                                onChange={(e) => setSeoDescription(e.target.value)}
                                placeholder="Max 160 characters recommended"
                                maxLength="170"
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
                                rows="3"
                            ></textarea>
                        </div>


                        {/* @unchanged (Submit/Cancel buttons) */}
                        <div className="flex gap-4 pt-2">
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
                                {editingCollection ? 'Update Collection' : 'Save Collection'}
                            </button>
                            {editingCollection && (
                                <button type="button" onClick={resetForm} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List of existing collections */}
                {/* @unchanged (List display logic) */}
                 <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Existing Collections</h2>
                    {isLoading ? <p>Loading...</p> : (
                        <div className="space-y-2">
                            {collections.map(collection => (
                                <div key={collection.id} className="flex items-center bg-gray-900/50 p-3 rounded-md">
                                    <span className="flex-grow font-medium">{collection.name}</span>
                                    {collection.is_featured && (
                                        <span className="text-xs font-semibold bg-indigo-600 text-indigo-100 px-2 py-1 rounded-full mr-4">Featured</span>
                                    )}
                                    <div className="flex gap-4">
                                        <button onClick={() => handleEdit(collection)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                                        <button onClick={() => handleDelete(collection.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                     { !isLoading && collections.length === 0 && <p className="text-gray-500 mt-4 text-center">No collections created yet.</p>}
                </div>
            </div>
        </div>
    );
}