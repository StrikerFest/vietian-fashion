'use client';

import { useState, useEffect } from 'react';
import OptionSetList from '@/components/admin/OptionSetList';
import OptionSetForm from '@/components/admin/OptionSetForm';

export default function ProductOptionsPage() {
    const [sets, setSets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'form'
    const [editingSet, setEditingSet] = useState(null);

    const fetchSets = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/option-sets');
            const data = await res.json();
            setSets(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSets();
    }, []);

    const handleDelete = async (id) => {
        if(!confirm("Delete this option set?")) return;
        await fetch(`/api/admin/option-sets/${id}`, { method: 'DELETE' });
        fetchSets();
    };

    const handleDuplicate = async (set) => {
        if(!confirm(`Duplicate "${set.title}"?`)) return;

        // Prepare payload for create endpoint
        const payload = {
            title: `${set.title} (Copy)`,
            priority: set.priority,
            is_active: false, // Default to inactive
            rules: set.rules,
            options: set.product_options // The API expects 'options', database has 'product_options'
        };

        try {
            const res = await fetch('/api/admin/option-sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(res.ok) {
                alert("Duplicated successfully!");
                fetchSets();
            }
        } catch(e) {
            alert(e.message);
        }
    };

    const handleSuccess = (msg) => {
        alert(msg);
        setView('list');
        setEditingSet(null);
        fetchSets();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Product Options</h1>
                {view === 'list' && (
                    <button
                        onClick={() => { setEditingSet(null); setView('form'); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + New Option Set
                    </button>
                )}
            </div>

            {view === 'list' ? (
                isLoading ? <p className="text-gray-400">Loading...</p> : (
                    <OptionSetList
                        optionSets={sets}
                        onEdit={(s) => { setEditingSet(s); setView('form'); }}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                    />
                )
            ) : (
                <div className="max-w-4xl">
                    <OptionSetForm
                        initialData={editingSet}
                        onSuccess={handleSuccess}
                        onCancel={() => { setView('list'); setEditingSet(null); }}
                    />
                </div>
            )}
        </div>
    );
}