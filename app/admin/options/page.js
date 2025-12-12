// app/admin/options/page.js
'use client';

import { useState, useEffect } from 'react';
import OptionSetList from '@/components/admin/OptionSetList';
import OptionSetForm from '@/components/admin/OptionSetForm';
import { useToast } from '@/context/ToastContext';

export default function ProductOptionsPage() {
    const { addToast } = useToast();
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
            addToast("Không thể tải các bộ tùy chọn.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSets();
    }, []);

    const handleDelete = async (id) => {
        if(!confirm("Xóa bộ tùy chọn này?")) return;
        await fetch(`/api/admin/option-sets/${id}`, { method: 'DELETE' });
        fetchSets();
        addToast("Bộ tùy chọn đã được lưu trữ thành công.", 'success');
    };

    const handleDuplicate = async (set) => {
        if(!confirm(`Sao chép "${set.title}"?`)) return;

        const payload = {
            title: `${set.title} (Sao chép)`,
            priority: set.priority,
            is_active: false,
            rules: set.rules,
            options: set.product_options
        };

        try {
            const res = await fetch('/api/admin/option-sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(res.ok) {
                addToast("Sao chép bộ tùy chọn thành công!", 'success');
                fetchSets();
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Sao chép thất bại');
            }
        } catch(e) {
            addToast(e.message, 'error');
        }
    };

    const handleSuccess = (msg) => {
        addToast(msg, 'success');
        setView('list');
        setEditingSet(null);
        fetchSets();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Tùy Chọn Sản Phẩm</h1>
                {view === 'list' && (
                    <button
                        onClick={() => { setEditingSet(null); setView('form'); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Bộ Tùy Chọn Mới
                    </button>
                )}
            </div>

            {view === 'list' ? (
                isLoading ? <p className="text-gray-400">Đang tải...</p> : (
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