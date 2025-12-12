// components/admin/TagList.js
'use client';

export default function TagList({ tags, onEdit, onDelete }) {
    if (tags.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">Không tìm thấy thẻ nào.</p>;
    }

    return (
        <div className="flex flex-wrap gap-3">
            {tags.map(tag => (
                <span key={tag.id} className="flex items-center bg-gray-900 border border-gray-700 rounded-full px-4 py-2 hover:border-gray-500 transition-colors">
                    <span className="font-medium text-gray-200 mr-3">{tag.name}</span>
                    <div className="flex gap-1 border-l border-gray-700 pl-3">
                        <button
                            onClick={() => onEdit(tag)}
                            className="text-indigo-400 hover:text-indigo-300 text-sm font-bold px-1"
                            title="Sửa"
                        >
                            ✎
                        </button>
                        <button
                            onClick={() => onDelete(tag.id)}
                            className="text-red-500 hover:text-red-400 text-sm font-bold px-1"
                            title="Xóa"
                        >
                            ×
                        </button>
                    </div>
                </span>
            ))}
        </div>
    );
}