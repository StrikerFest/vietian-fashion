// app/admin/tags/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';

export default function TagsPage() {
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form & Search State
    const [name, setName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTag, setEditingTag] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Tags
    const fetchTags = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/tags');
            if (!response.ok) throw new Error('Failed to fetch tags');
            const data = await response.json();
            setTags(data || []);
        } catch (error) {
            console.error("Failed to fetch tags:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    // Filter logic
    const filteredTags = useMemo(() => {
        if (!searchQuery) return tags;
        return tags.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [tags, searchQuery]);

    // Form Handlers
    const resetForm = () => {
        setName('');
        setEditingTag(null);
        setIsSubmitting(false);
    };

    const handleEdit = (tag) => {
        setEditingTag(tag);
        setName(tag.name);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags';
        const method = editingTag ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Operation failed');
            }

            await fetchTags(); // Refresh list
            resetForm();
            alert(`Tag ${editingTag ? 'updated' : 'created'} successfully!`);
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This will only work if the tag is unused.')) return;

        try {
            const response = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Delete failed');
            }
            setTags(prev => prev.filter(t => t.id !== id));
            alert('Tag deleted.');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Tags</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* --- Left: Form --- */}
                <div className="md:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4 sticky top-6">
                        <h2 className="text-xl font-semibold">{editingTag ? 'Edit Tag' : 'Add New Tag'}</h2>
                        <div>
                            <label htmlFor="tagName" className="block text-sm font-medium mb-1">Tag Name</label>
                            <input
                                id="tagName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., cotton, summer, vintage"
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600"
                            >
                                {isSubmitting ? 'Saving...' : (editingTag ? 'Update' : 'Create')}
                            </button>
                            {editingTag && (
                                <button type="button" onClick={resetForm} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* --- Right: List --- */}
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-semibold">Existing Tags</h2>
                        {/* Search */}
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Search tags..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
                        </div>
                    </div>

                    {isLoading ? (
                        <p className="text-gray-400">Loading tags...</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {filteredTags.map(tag => (
                                <span key={tag.id} className="flex items-center bg-gray-900 border border-gray-700 rounded-full px-4 py-2">
                                    <span className="font-medium text-gray-200 mr-3">{tag.name}</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(tag)}
                                            className="p-1 text-indigo-400 hover:text-indigo-300"
                                            title="Edit"
                                        >
                                            ✎
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tag.id)}
                                            className="p-1 text-red-500 hover:text-red-400"
                                            title="Delete"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </span>
                            ))}
                            {!isLoading && filteredTags.length === 0 && (
                                <p className="text-gray-500 w-full text-center mt-4">No tags found.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}