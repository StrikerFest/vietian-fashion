// app/admin/categories/page.js
'use client';

import { useState, useEffect } from 'react';

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState('');

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

    useEffect(() => {
        fetchCategories();
    }, []);

    const resetForm = () => {
        setName('');
        setDescription('');
        setParentId('');
        setEditingCategory(null);
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setName(category.name);
        setDescription(category.description || '');
        setParentId(category.parent_id || '');
    };

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
            fetchCategories(); // Refetch to update the list
            alert('Category deleted successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isEditing = !!editingCategory;
        const url = isEditing ? `/api/categories/${editingCategory.id}` : '/api/categories';
        const method = isEditing ? 'PUT' : 'POST';

        const body = {
            name,
            description,
            parent_id: parentId || null,
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
            fetchCategories(); // Refetch the list to show changes
            alert(`Category ${isEditing ? 'updated' : 'created'} successfully!`);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // Helper to render categories hierarchically
    const renderCategories = (parentId = null, level = 0) => {
        const children = categories.filter(c => c.parent_id === parentId);
        return children.map(category => (
            <div key={category.id}>
                <div className={`flex items-center bg-gray-800 p-3 rounded-md mb-2`} style={{ marginLeft: `${level * 2}rem` }}>
                    <span className="flex-grow font-medium">{category.name}</span>
                    <div className="flex gap-4">
                        <button onClick={() => handleEdit(category)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                        <button onClick={() => handleDelete(category.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                    </div>
                </div>
                {renderCategories(category.id, level + 1)}
            </div>
        ));
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Categories</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form for adding/editing */}
                <div className="md:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4">
                        <h2 className="text-xl font-semibold">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1">Category Name</label>
                            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md" required />
                        </div>
                        <div>
                            <label htmlFor="parent_id" className="block text-sm font-medium mb-1">Parent Category (optional)</label>
                            <select id="parent_id" value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md">
                                <option value="">-- No Parent --</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id} disabled={editingCategory?.id === c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md" rows="3"></textarea>
                        </div>
                        <div className="flex gap-4">
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
                                {editingCategory ? 'Update Category' : 'Save Category'}
                            </button>
                            {editingCategory && (
                                <button type="button" onClick={resetForm} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List of existing categories */}
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Existing Categories</h2>
                    {isLoading ? <p>Loading...</p> : <div>{renderCategories()}</div>}
                </div>
            </div>
        </div>
    );
}