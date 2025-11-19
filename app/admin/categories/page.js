// app/admin/categories/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);

    // --- Form state ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState('');
    // --- SEO Form State ---
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');

    // --- NEW: Search State ---
    const [searchQuery, setSearchQuery] = useState('');

    // @unchanged (fetchCategories)
    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/categories');
            const data = await response.json();
            setCategories(data || []);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        }
        setIsLoading(false);
    };

    // @unchanged (useEffect)
    useEffect(() => {
        fetchCategories();
    }, []);

    // --- NEW: Filtered Categories Logic ---
    const filteredCategories = useMemo(() => {
        if (!searchQuery) return categories; // Return all if no search
        return categories.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [categories, searchQuery]);

    // @unchanged (resetForm)
    const resetForm = () => {
        setName('');
        setDescription('');
        setParentId('');
        setSeoTitle('');
        setSeoDescription('');
        setEditingCategory(null);
    };

    // @unchanged (handleEdit)
    const handleEdit = (category) => {
        setEditingCategory(category);
        setName(category.name);
        setDescription(category.description || '');
        setParentId(category.parent_id || '');
        setSeoTitle(category.seo_title || '');
        setSeoDescription(category.seo_description || '');
    };

    // @unchanged (handleDelete)
    const handleDelete = async (categoryId) => {
        if (!confirm('Are you sure you want to delete this category? This can only be done if it has no sub-categories or products.')) {
            return;
        }
        try {
            const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete category');
            }
            fetchCategories();
            alert('Category deleted successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // @unchanged (handleSubmit)
    const handleSubmit = async (e) => {
        e.preventDefault();
        const isEditing = !!editingCategory;
        const url = isEditing ? `/api/categories/${editingCategory.id}` : '/api/categories';
        const method = isEditing ? 'PUT' : 'POST';

        const body = {
            name,
            description,
            parent_id: parentId || null,
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
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} category`);
            }

            resetForm();
            fetchCategories();
            alert(`Category ${isEditing ? 'updated' : 'created'} successfully!`);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // @unchanged (renderCategories - Tree View)
    const renderCategoriesTree = (parentId = null, level = 0) => {
        // Use the original 'categories' list to build the tree structure
        const children = categories.filter(c => c.parent_id === parentId);

        if (children.length === 0) return null;

        return children.map(category => (
            <div key={category.id}>
                <div className={`flex items-center bg-gray-900/50 p-3 rounded-md mb-2 border border-gray-700 hover:border-indigo-500 transition-colors`} style={{ marginLeft: `${level * 2}rem` }}>
                    <span className="flex-grow font-medium">
                        {level > 0 && <span className="text-gray-500 mr-2">↳</span>}
                        {category.name}
                    </span>
                    <div className="flex gap-3 text-sm">
                        <button onClick={() => handleEdit(category)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                        <button onClick={() => handleDelete(category.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                    </div>
                </div>
                {renderCategoriesTree(category.id, level + 1)}
            </div>
        ));
    };

    // --- NEW: Render Flat List (for Search Results) ---
    const renderSearchResults = () => {
        if (filteredCategories.length === 0) {
            return <p className="text-gray-500 text-center mt-4">{`No categories found matching "${searchQuery}".`}</p>;
        }
        return filteredCategories.map(category => {
            // Find parent name for context
            const parent = categories.find(c => c.id === category.parent_id);

            return (
                <div key={category.id} className="flex items-center bg-gray-900/50 p-3 rounded-md mb-2 border border-gray-700">
                    <div className="flex-grow">
                        <p className="font-medium">{category.name}</p>
                        {parent && <p className="text-xs text-gray-500">Parent: {parent.name}</p>}
                    </div>
                    <div className="flex gap-3 text-sm">
                        <button onClick={() => handleEdit(category)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                        <button onClick={() => handleDelete(category.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Categories</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form for adding/editing */}
                <div className="md:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4 sticky top-6">
                        <h2 className="text-xl font-semibold">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1">Category Name</label>
                            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500" required />
                        </div>
                        {/* Parent */}
                        <div>
                            <label htmlFor="parent_id" className="block text-sm font-medium mb-1">Parent Category (optional)</label>
                            <select id="parent_id" value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500">
                                <option value="">-- No Parent (Top Level) --</option>
                                {categories
                                    // Prevent selecting itself or its children as parent when editing (to avoid loops)
                                    .filter(c => !(editingCategory && (c.id === editingCategory.id)))
                                    .map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                            </select>
                        </div>
                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500" rows="3"></textarea>
                        </div>

                        {/* SEO Section */}
                        <div className="pt-2 border-t border-gray-700">
                            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">SEO Settings</p>
                            <div className="mb-3">
                                <label htmlFor="seoTitleCat" className="block text-xs font-medium mb-1 text-gray-300">SEO Title</label>
                                <input id="seoTitleCat" type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Max 60 chars" maxLength="70" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm" />
                            </div>
                            <div>
                                <label htmlFor="seoDescriptionCat" className="block text-xs font-medium mb-1 text-gray-300">Meta Description</label>
                                <textarea id="seoDescriptionCat" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Max 160 chars" maxLength="170" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm" rows="2"></textarea>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                {editingCategory ? 'Update' : 'Create'}
                            </button>
                            {editingCategory && (
                                <button type="button" onClick={resetForm} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List of existing categories */}
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h2 className="text-xl font-semibold">Existing Categories</h2>

                        {/* --- NEW: Search Bar --- */}
                        <div className="relative w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {isLoading ? (
                        <p className="text-gray-400">Loading...</p>
                    ) : (
                        <div>
                            {/* Conditional Rendering based on search */}
                            {searchQuery ? renderSearchResults() : renderCategoriesTree()}

                            {!isLoading && categories.length === 0 && (
                                <p className="text-gray-500 mt-4 text-center">No categories created yet.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}