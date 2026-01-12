'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function GuideSettings() {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Data
    const [sizeGuides, setSizeGuides] = useState([]); // [{ id: 1, name: 'Áo thun', categories: ['ao-thun'], columns: [], rows: [] }]
    const [careGuides, setCareGuides] = useState([]); // [{ id: 1, name: 'Cotton', attributes: ['cotton'], content: '' }]
    
    // Metadata for Autocomplete
    const [allCategories, setAllCategories] = useState([]); // Catalog type
    const [allAttributes, setAllAttributes] = useState([]); // Attribute type

    // UI State
    const [activeTab, setActiveTab] = useState('size');
    const [editingSize, setEditingSize] = useState(null);
    const [editingCare, setEditingCare] = useState(null);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Existing Settings
                const settingsRes = await fetch('/api/settings?key=guide_settings');
                const settingsData = await settingsRes.json();
                
                if (settingsData && settingsData.value) {
                    setSizeGuides(settingsData.value.size_guides || []);
                    setCareGuides(settingsData.value.care_guides || []);
                }

                // 2. Fetch Categories for Autocomplete
                const catsRes = await fetch('/api/categories');
                const catsData = await catsRes.json();
                
                setAllCategories(catsData.filter(c => c.type === 'catalog'));
                setAllAttributes(catsData.filter(c => c.type === 'attribute'));

            } catch (error) {
                console.error("Failed to load guides:", error);
                addToast("Lỗi tải dữ liệu.", 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [addToast]);

    // --- SAVE DATA ---
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'guide_settings',
                    value: { size_guides: sizeGuides, care_guides: careGuides },
                    description: 'Cấu hình bảng size và hướng dẫn bảo quản'
                })
            });
            addToast("Đã lưu cấu hình thành công!", 'success');
        } catch (error) {
            addToast("Lưu thất bại: " + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- HELPERS ---
    const generateId = () => Math.random().toString(36).substr(2, 9);

    // --- RENDERERS ---
    
    // 1. Size Guide Editor
    const renderSizeEditor = () => {
        if (!editingSize) return null;

        const updateColumn = (idx, val) => {
            const newCols = [...editingSize.columns];
            newCols[idx] = val;
            setEditingSize({ ...editingSize, columns: newCols });
        };

        const updateRow = (rIdx, cIdx, val) => {
            const newRows = [...editingSize.rows];
            newRows[rIdx][cIdx] = val;
            setEditingSize({ ...editingSize, rows: newRows });
        };

        const addRow = () => {
            const newRow = new Array(editingSize.columns.length).fill('');
            setEditingSize({ ...editingSize, rows: [...editingSize.rows, newRow] });
        };

        const addColumn = () => {
            setEditingSize({
                ...editingSize,
                columns: [...editingSize.columns, 'Mới'],
                rows: editingSize.rows.map(r => [...r, ''])
            });
        };

        const toggleCategory = (slug) => {
            const cats = editingSize.categories.includes(slug)
                ? editingSize.categories.filter(c => c !== slug)
                : [...editingSize.categories, slug];
            setEditingSize({ ...editingSize, categories: cats });
        };

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">Chỉnh sửa Bảng Size</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Tên bảng size</label>
                            <input 
                                value={editingSize.name} 
                                onChange={e => setEditingSize({ ...editingSize, name: e.target.value })}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                                placeholder="vd: Áo thun nam"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Áp dụng cho Danh mục (Chọn nhiều)</label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-gray-900 p-2 rounded border border-gray-700">
                                {allCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => toggleCategory(cat.slug)}
                                        className={`px-3 py-1 rounded text-xs border transition-colors ${
                                            editingSize.categories.includes(cat.slug)
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table Editor */}
                        <div className="overflow-x-auto border border-gray-700 rounded-lg">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs uppercase bg-gray-700">
                                    <tr>
                                        {editingSize.columns.map((col, idx) => (
                                            <th key={idx} className="px-2 py-2 min-w-[100px]">
                                                <input 
                                                    value={col} 
                                                    onChange={e => updateColumn(idx, e.target.value)}
                                                    className="w-full bg-transparent border-b border-gray-500 focus:border-indigo-500 outline-none text-white font-bold"
                                                />
                                            </th>
                                        ))}
                                        <th className="px-2 py-2 w-10">
                                            <button onClick={addColumn} className="text-green-400 hover:text-green-300 text-lg">+</button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editingSize.rows.map((row, rIdx) => (
                                        <tr key={rIdx} className="border-b border-gray-700">
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="px-2 py-2">
                                                    <input 
                                                        value={cell} 
                                                        onChange={e => updateRow(rIdx, cIdx, e.target.value)}
                                                        className="w-full bg-transparent outline-none text-white hover:bg-gray-700/50 rounded px-1"
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-2 py-2 text-center">
                                                <button 
                                                    onClick={() => setEditingSize({ ...editingSize, rows: editingSize.rows.filter((_, i) => i !== rIdx) })}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={addRow} className="w-full py-2 text-center text-gray-400 hover:bg-gray-700/50 hover:text-white transition-colors text-sm border-t border-gray-700">
                                + Thêm hàng mới
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                        <button onClick={() => setEditingSize(null)} className="px-4 py-2 text-gray-400 hover:text-white">Hủy</button>
                        <button 
                            onClick={() => {
                                // Save to main state
                                const newGuides = editingSize.id 
                                    ? sizeGuides.map(g => g.id === editingSize.id ? editingSize : g)
                                    : [...sizeGuides, { ...editingSize, id: generateId() }];
                                setSizeGuides(newGuides);
                                setEditingSize(null);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold"
                        >
                            Lưu Bảng Size
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // 2. Care Guide Editor
    const renderCareEditor = () => {
        if (!editingCare) return null;

        const toggleAttribute = (slug) => {
            const attrs = editingCare.attributes.includes(slug)
                ? editingCare.attributes.filter(a => a !== slug)
                : [...editingCare.attributes, slug];
            setEditingCare({ ...editingCare, attributes: attrs });
        };

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">Chỉnh sửa Hướng dẫn bảo quản</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Tên hướng dẫn</label>
                            <input 
                                value={editingCare.name} 
                                onChange={e => setEditingCare({ ...editingCare, name: e.target.value })}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                                placeholder="vd: Cotton, Lụa..."
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Áp dụng cho Thuộc tính (Chọn nhiều)</label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-gray-900 p-2 rounded border border-gray-700">
                                {allAttributes.map(attr => (
                                    <button
                                        key={attr.id}
                                        onClick={() => toggleAttribute(attr.slug)}
                                        className={`px-3 py-1 rounded text-xs border transition-colors ${
                                            editingCare.attributes.includes(attr.slug)
                                                ? 'bg-purple-600 border-purple-500 text-white'
                                                : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                                        }`}
                                    >
                                        {attr.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Nội dung hướng dẫn</label>
                            <textarea 
                                value={editingCare.content} 
                                onChange={e => setEditingCare({ ...editingCare, content: e.target.value })}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white h-32"
                                placeholder="Nhập hướng dẫn giặt ủi, bảo quản..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                        <button onClick={() => setEditingCare(null)} className="px-4 py-2 text-gray-400 hover:text-white">Hủy</button>
                        <button 
                            onClick={() => {
                                const newGuides = editingCare.id 
                                    ? careGuides.map(g => g.id === editingCare.id ? editingCare : g)
                                    : [...careGuides, { ...editingCare, id: generateId() }];
                                setCareGuides(newGuides);
                                setEditingCare(null);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold"
                        >
                            Lưu Hướng Dẫn
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) return <div className="text-gray-400">Đang tải cấu hình...</div>;

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
                <button 
                    onClick={() => setActiveTab('size')} 
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'size' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                    Bảng Size
                </button>
                <button 
                    onClick={() => setActiveTab('care')} 
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'care' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                >
                    Bảo quản
                </button>
            </div>

            {/* Content */}
            {activeTab === 'size' && (
                <div>
                    <button 
                        onClick={() => setEditingSize({ id: null, name: '', categories: [], columns: ['Size', 'Thông số 1'], rows: [['S', ''], ['M', '']] })}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-bold mb-4"
                    >
                        + Tạo Bảng Size Mới
                    </button>

                    <div className="grid grid-cols-1 gap-4">
                        {sizeGuides.map(guide => (
                            <div key={guide.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-white">{guide.name}</h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Áp dụng: {guide.categories.length > 0 ? guide.categories.join(', ') : <span className="italic text-gray-600">Chưa chọn danh mục</span>}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingSize(guide)} className="text-indigo-400 hover:text-white text-sm">Sửa</button>
                                    <button 
                                        onClick={() => {
                                            if(confirm('Xóa bảng này?')) setSizeGuides(prev => prev.filter(g => g.id !== guide.id));
                                        }} 
                                        className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'care' && (
                <div>
                    <button 
                        onClick={() => setEditingCare({ id: null, name: '', attributes: [], content: '' })}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-bold mb-4"
                    >
                        + Tạo Hướng Dẫn Mới
                    </button>

                    <div className="grid grid-cols-1 gap-4">
                        {careGuides.map(guide => (
                            <div key={guide.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-white">{guide.name}</h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Thuộc tính: {guide.attributes.length > 0 ? guide.attributes.join(', ') : <span className="italic text-gray-600">Chưa chọn</span>}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingCare(guide)} className="text-indigo-400 hover:text-white text-sm">Sửa</button>
                                    <button 
                                        onClick={() => {
                                            if(confirm('Xóa hướng dẫn này?')) setCareGuides(prev => prev.filter(g => g.id !== guide.id));
                                        }} 
                                        className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Global Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-800 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all"
                >
                    {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
            </div>

            {renderSizeEditor()}
            {renderCareEditor()}
        </div>
    );
}