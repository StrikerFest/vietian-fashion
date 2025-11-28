// app/admin/templates/page.js
'use client';

import { useState, useEffect } from 'react';
import TemplateForm from '@/components/admin/TemplateForm';
import TemplateList from '@/components/admin/TemplateList';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function TemplatesPage() {
    const { addToast } = useToast(); // --- NEW ---
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/templates');
            const data = await res.json();
            setTemplates(data || []);
        } catch (error) {
            console.error(error);
            addToast("Failed to load templates.", 'error'); // --- FIXED: Added error handling ---
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchTemplates(); }, []);

    const handleDelete = async (id) => {
        if (!confirm('Delete this template?')) return;
        try {
            const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete template');
            fetchTemplates();
            addToast('Template deleted successfully!', 'success'); // --- FIXED: Added success toast ---
        } catch (error) {
            addToast(error.message, 'error'); // --- FIXED: Added error toast ---
        }
    };

    const handleSuccess = (msg) => {
        addToast(msg, 'success'); // --- FIXED: Replaced alert() ---
        setShowForm(false);
        setEditingTemplate(null);
        fetchTemplates();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Email Templates</h1>

            {!showForm && (
                <button
                    onClick={() => { setEditingTemplate(null); setShowForm(true); }}
                    className="mb-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                    + Create Template
                </button>
            )}

            {showForm ? (
                <div className="max-w-3xl">
                    <TemplateForm
                        initialData={editingTemplate}
                        onSuccess={handleSuccess}
                        onCancel={() => { setShowForm(false); setEditingTemplate(null); }}
                    />
                </div>
            ) : (
                <div className="max-w-4xl">
                    {isLoading ? <p className="text-gray-400">Loading...</p> : (
                        <TemplateList
                            templates={templates}
                            onEdit={(t) => { setEditingTemplate(t); setShowForm(true); }}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            )}
        </div>
    );
}