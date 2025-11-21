// components/admin/CategoryList.js
'use client';

export default function CategoryList({ categories, searchQuery, onEdit, onDelete }) {
    // Helper: Recursively render tree
    const renderTree = (parentId = null, level = 0) => {
        const children = categories.filter(c => c.parent_id === parentId);
        if (children.length === 0) return null;

        return children.map(category => (
            <div key={category.id}>
                <div
                    className="flex items-center bg-gray-900/50 p-3 rounded-md mb-2 border border-gray-700 hover:border-indigo-500 transition-colors"
                    style={{ marginLeft: `${level * 2}rem` }}
                >
                    <span className="flex-grow font-medium text-white">
                        {level > 0 && <span className="text-gray-500 mr-2">↳</span>}
                        {category.name}
                    </span>
                    <div className="flex gap-3 text-sm">
                        <button
                            onClick={() => onEdit(category)}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(category.id)}
                            className="text-red-500 hover:text-red-400 font-semibold"
                        >
                            Delete
                        </button>
                    </div>
                </div>
                {renderTree(category.id, level + 1)}
            </div>
        ));
    };

    // Helper: Render flat list for search
    const renderSearchResults = () => {
        const filtered = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

        if (filtered.length === 0) {
            return <p className="text-gray-500 text-center mt-4">No categories found.</p>;
        }

        return filtered.map(category => {
            const parent = categories.find(c => c.id === category.parent_id);
            return (
                <div key={category.id} className="flex items-center bg-gray-900/50 p-3 rounded-md mb-2 border border-gray-700">
                    <div className="flex-grow">
                        <p className="font-medium text-white">{category.name}</p>
                        {parent && <p className="text-xs text-gray-500">Parent: {parent.name}</p>}
                    </div>
                    <div className="flex gap-3 text-sm">
                        <button onClick={() => onEdit(category)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                        <button onClick={() => onDelete(category.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                    </div>
                </div>
            );
        });
    };

    if (categories.length === 0) {
        return <p className="text-gray-500 mt-4 text-center">No categories created yet.</p>;
    }

    return (
        <div className="space-y-2">
            {searchQuery ? renderSearchResults() : renderTree()}
        </div>
    );
}