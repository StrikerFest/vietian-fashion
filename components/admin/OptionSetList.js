'use client';

export default function OptionSetList({ optionSets, onEdit, onDelete, onDuplicate }) {
    if (!optionSets || optionSets.length === 0) {
        return <p className="text-center text-gray-500 py-8">No option sets found. Create one to get started.</p>;
    }

    const getRuleSummary = (rules) => {
        if (!rules || rules.length === 0) return "No rules (Inactive)";
        const types = rules.map(r => r.type);
        if (types.includes('all')) return "All Products";
        return `Matches: ${types.join(', ')}`;
    };

    return (
        <div className="space-y-4">
            {optionSets.map(set => (
                <div key={set.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500 transition-colors">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-lg text-white">{set.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${set.is_active ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-400'}`}>
                                {set.is_active ? 'Active' : 'Disabled'}
                            </span>
                            <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">
                                Priority: {set.priority}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                            Contains {set.product_options?.length || 0} fields • Applies to: <span className="text-indigo-300">{getRuleSummary(set.rules)}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onDuplicate(set)}
                            className="text-sm text-gray-400 hover:text-white px-2 py-1 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
                        >
                            Duplicate
                        </button>
                        <button
                            onClick={() => onEdit(set)}
                            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-bold transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(set.id)}
                            className="text-sm text-red-400 hover:text-red-300 px-2 font-bold"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}