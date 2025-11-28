// components/admin/CollectionForm.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function CollectionForm({ initialData, onSuccess, onCancel }) {
    const { addToast } = useToast(); // --- NEW ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isFeatured, setIsFeatured] = useState(false);
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            setIsFeatured(initialData.is_featured || false);
            setSeoTitle(initialData.seo_title || '');
            setSeoDescription(initialData.seo_description || '');
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const isEditing = !!initialData;
        const url = isEditing ? `/api/collections/${initialData.id}` : '/api/collections';
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
                throw new Error(errorData.error || 'Operation failed');
            }

            onSuccess(isEditing ? 'Collection updated!' : 'Collection created!');
        } catch (error) {
            addToast(`Error: ${error.message}`, 'error'); // --- FIXED: Replaced alert() ---
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">{initialData ? 'Edit Collection' : 'Add New Collection'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">Collection Name</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                        rows="3"
                    ></textarea>
                </div>

                <div className="flex items-center p-3 bg-gray-900/50 rounded border border-gray-700">
                    <input
                        id="isFeatured"
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="isFeatured" className="ml-2 block text-sm font-medium cursor-pointer">Feature on homepage</label>
                </div>

                {/* SEO Section */}
                <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">SEO Settings</p>
                    <div className="mb-3">
                        <label htmlFor="seoTitle" className="block text-xs font-medium mb-1 text-gray-300">SEO Title</label>
                        <input
                            id="seoTitle"
                            type="text"
                            value={seoTitle}
                            onChange={(e) => setSeoTitle(e.target.value)}
                            placeholder="Max 60 chars"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="seoDescription" className="block text-xs font-medium mb-1 text-gray-300">Meta Description</label>
                        <textarea
                            id="seoDescription"
                            value={seoDescription}
                            onChange={(e) => setSeoDescription(e.target.value)}
                            placeholder="Max 160 chars"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                            rows="2"
                        ></textarea>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600"
                    >
                        {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
                    </button>
                </div>
            </form>
        </div>
    );
}