// components/admin/CategoryList.js
'use client';

export default function CategoryList({ categories, searchQuery, onEdit, onDelete }) {

    // Helper to check if item is currently active based on dates
    const getTimingStatus = (cat) => {
        if (!cat.is_active) return { label: 'Không hoạt động', color: 'bg-red-900 text-red-200' };

        const now = new Date();
        if (cat.start_date && new Date(cat.start_date) > now) return { label: 'Đã lên lịch', color: 'bg-yellow-900 text-yellow-200' };
        if (cat.end_date && new Date(cat.end_date) < now) return { label: 'Hết hạn', color: 'bg-gray-700 text-gray-400' };

        return { label: 'Hoạt động', color: 'bg-green-900 text-green-200' };
    };

    // Helper to render a single row
    const CategoryRow = ({ category, level }) => {
        const status = getTimingStatus(category);
        const isCatalog = category.type === 'catalog';

        return (
            <div className={`
                flex items-center justify-between p-3 rounded-md border mb-2 transition-colors
                ${isCatalog ? 'bg-gray-800 border-gray-700' : 'bg-gray-900/30 border-gray-800'}
                hover:border-indigo-500
            `}
                 style={{ marginLeft: `${level * 1.5}rem` }}
            >
                <div className="flex items-center gap-3">
                    {/* Type Badge */}
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        isCatalog ? 'bg-blue-900 text-blue-200' : 'bg-purple-900 text-purple-200'
                    }`}>
                        {isCatalog ? 'Menu' : 'Bộ lọc'}
                    </span>

                    {/* Hierarchy Indicator */}
                    <span className="font-medium text-white flex items-center">
                        {level > 0 && <span className="text-gray-600 mr-2">↳</span>}
                        {category.name}
                    </span>

                    {/* Style Indicator (for attributes) */}
                    {!isCatalog && category.display_style !== 'list' && (
                        <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 rounded">
                            {category.display_style}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Status Badge */}
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
        );
    };

    // Recursive Tree Renderer
    const renderTree = (parentId = null, level = 0) => {
        const children = categories
            .filter(c => c.parent_id === parentId)
            .sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name)); // Sort by Order, then Name

        if (children.length === 0) return null;

        return children.map(category => (
            <div key={category.id}>
                <CategoryRow category={category} level={level} />
                {renderTree(category.id, level + 1)}
            </div>
        ));
    };

    // Flat Search Renderer
    const renderSearchResults = () => {
        const filtered = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (filtered.length === 0) return <p className="text-gray-500 text-center mt-4">Không tìm thấy kết quả.</p>;
        return filtered.map(category => <CategoryRow key={category.id} category={category} level={0} />);
    };

    if (categories.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">Không tìm thấy danh mục nào.</p>;
    }

    return (
        <div className="space-y-1">
            {/* Optional Header Row to explain types if list is long */}
            <div className="flex justify-end mb-2 space-x-4 text-xs text-gray-500 px-2">
                <span className="flex items-center"><span className="w-2 h-2 bg-blue-900 rounded-full mr-1"></span> Điều hướng</span>
                <span className="flex items-center"><span className="w-2 h-2 bg-purple-900 rounded-full mr-1"></span> Bộ lọc</span>
            </div>

            {searchQuery ? renderSearchResults() : renderTree()}
        </div>
    );
}