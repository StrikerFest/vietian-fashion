// components/admin/CategoryList.js
'use client';

import { useState } from 'react';

export default function CategoryList({
                                         categories = [],
                                         rootCategories = [],
                                         selectedIds = new Set(),
                                         onSelectionChange,
                                         onEdit,
                                         onDelete
                                     }) {
    // Track expanded category IDs
    const [expanded, setExpanded] = useState(new Set());

    const toggleExpand = (id) => {
        const next = new Set(expanded);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setExpanded(next);
    };

    const handleSelect = (id, isChecked) => {
        const next = new Set(selectedIds);
        if (isChecked) {
            next.add(id);
        } else {
            next.delete(id);
        }
        onSelectionChange(next);
    };


    // Helper to check if item is currently active
    const getTimingStatus = (cat) => {
        if (!cat.is_active) return { label: 'Không hoạt động', color: 'bg-red-900 text-red-200' };

        const now = new Date();
        if (cat.start_date && new Date(cat.start_date) > now) return { label: 'Đã lên lịch', color: 'bg-yellow-900 text-yellow-200' };
        if (cat.end_date && new Date(cat.end_date) < now) return { label: 'Hết hạn', color: 'bg-gray-700 text-gray-400' };

        return { label: 'Hoạt động', color: 'bg-green-900 text-green-200' };
    };

    // Recursive rendering helper
    const renderRow = (category, level = 0) => {
        // Find children from the full dataset
        const children = categories
            .filter(c => c.parent_id === category.id)
            .sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));

        const hasChildren = children.length > 0;
        const isExpanded = expanded.has(category.id);
        const status = getTimingStatus(category);
        const isCatalog = category.type === 'catalog';
        const isSelected = selectedIds.has(category.id);

        return (
            <div key={category.id}>
                <div
                    className={`
                        flex items-center justify-between p-3 rounded-md border mb-2 transition-colors
                        ${isSelected ? 'bg-indigo-900/50 border-indigo-700' : (isCatalog ? 'bg-gray-800 border-gray-700' : 'bg-gray-900/30 border-gray-800')}
                        hover:border-indigo-500
                    `}
                    style={{ marginLeft: `${level * 1.5}rem` }}
                >
                    <div className="flex items-center gap-3 flex-1">
                        {/* Checkbox */}
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelect(category.id, e.target.checked)}
                            className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />

                        {/* Expand/Collapse Toggle */}
                        <button
                            onClick={() => toggleExpand(category.id)}
                            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 transition-transform ${hasChildren ? 'visible' : 'invisible'}`}
                            disabled={!hasChildren}
                        >
                            <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                        </button>

                        {/* Type Badge */}
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            isCatalog ? 'bg-blue-900 text-blue-200' : 'bg-purple-900 text-purple-200'
                        }`}>
                            {isCatalog ? 'Menu' : 'Bộ lọc'}
                        </span>

                        {/* Name */}
                        <span className="font-medium text-white flex items-center gap-2">
                            {category.name}
                            {hasChildren && !isExpanded && (
                                <span className="text-xs text-gray-500">({children.length} mục con)</span>
                            )}
                        </span>

                        {/* Style Indicator (for attributes) */}
                        {!isCatalog && category.display_style !== 'list' && (
                            <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 rounded">
                                {category.display_style}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                        </span>

                        <div className="flex gap-2 text-sm">
                            <button onClick={() => onEdit(category)} className="text-indigo-400 hover:text-indigo-300 font-semibold px-2">
                                Sửa
                            </button>
                            <button onClick={() => onDelete(category.id)} className="text-red-500 hover:text-red-400 font-semibold px-2">
                                &times;
                            </button>
                        </div>
                    </div>
                </div>

                {/* Render Children if Expanded */}
                {isExpanded && hasChildren && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        {children.map(child => renderRow(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (!rootCategories || rootCategories.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">Không tìm thấy danh mục nào phù hợp.</p>;
    }

    return (
        <div className="space-y-1">
            <div className="flex justify-end mb-2 space-x-4 text-xs text-gray-500 px-2">
                <span className="flex items-center"><span className="w-2 h-2 bg-blue-900 rounded-full mr-1"></span> Điều hướng (Catalog)</span>
                <span className="flex items-center"><span className="w-2 h-2 bg-purple-900 rounded-full mr-1"></span> Bộ lọc (Attribute)</span>
            </div>

            {rootCategories.map(cat => renderRow(cat, 0))}
        </div>
    );
}