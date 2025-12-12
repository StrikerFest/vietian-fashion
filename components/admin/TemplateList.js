// components/admin/TemplateList.js
'use client';

export default function TemplateList({ templates, onEdit, onDelete }) {
    if (templates.length === 0) return <p className="text-gray-500 text-center">Không tìm thấy mẫu nào.</p>;

    return (
        <div className="grid gap-4">
            {templates.map(t => (
                <div key={t.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-start hover:border-indigo-500 transition-colors">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-white text-lg">{t.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${
                                t.type === 'wishlist_sale' ? 'bg-purple-900 text-purple-200' :
                                    t.type === 'order_confirm' ? 'bg-green-900 text-green-200' : 'bg-blue-900 text-blue-200'
                            }`}>
                                {t.type.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">Chủ đề: <span className="text-gray-300 italic">{t.subject}</span></p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(t)} className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm">Sửa</button>
                        <button onClick={() => onDelete(t.id)} className="text-red-500 hover:text-red-400 font-semibold text-sm">Xóa</button>
                    </div>
                </div>
            ))}
        </div>
    );
}