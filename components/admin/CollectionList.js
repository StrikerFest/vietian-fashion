// components/admin/CollectionList.js
'use client';

export default function CollectionList({ collections, onEdit, onDelete }) {
    if (collections.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">Không tìm thấy bộ sưu tập nào.</p>;
    }

    return (
        <div className="space-y-3">
            {collections.map(collection => (
                <div key={collection.id} className="flex items-center bg-gray-900/50 p-3 rounded-md border border-gray-700 hover:border-indigo-500 transition-colors">
                    <div className="flex-grow">
                        <span className="font-medium text-lg text-white">{collection.name}</span>
                        {collection.description && (
                            <p className="text-sm text-gray-400 truncate max-w-md">{collection.description}</p>
                        )}
                    </div>

                    {collection.is_featured && (
                        <span className="text-[10px] font-bold bg-indigo-900 text-indigo-200 px-2 py-1 rounded-full mr-4 border border-indigo-700">
                            Nổi bật
                        </span>
                    )}

                    <div className="flex gap-3 text-sm">
                        <button
                            onClick={() => onEdit(collection)}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                            Sửa
                        </button>
                        <button
                            onClick={() => onDelete(collection.id)}
                            className="text-red-500 hover:text-red-400 font-semibold"
                        >
                            Xóa
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}