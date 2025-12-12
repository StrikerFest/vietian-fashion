// components/ui/PaginationControls.js
'use client';

export default function PaginationControls({
                                               currentPage,
                                               totalPages,
                                               onPageChange,
                                               limit,
                                               onLimitChange,
                                               totalItems,
                                               isLoading
                                           }) {
    // Helper to generate page numbers
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    if (totalItems === 0) return null;

    return (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-6 border-t border-gray-700 mt-8">
            {/* Left: Info & Limit */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>
                    Hiển thị <span className="font-medium text-white">{(currentPage - 1) * limit + 1}</span> đến{' '}
                    <span className="font-medium text-white">{Math.min(currentPage * limit, totalItems)}</span> trong số{' '}
                    <span className="font-medium text-white">{totalItems}</span> kết quả
                </span>

                {onLimitChange && (
                    <select
                        value={limit}
                        onChange={(e) => onLimitChange(Number(e.target.value))}
                        disabled={isLoading}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500 text-white"
                    >
                        <option value="12">12 / trang</option>
                        <option value="24">24 / trang</option>
                        <option value="48">48 / trang</option>
                        <option value="100">100 / trang</option>
                    </select>
                )}
            </div>

            {/* Right: Pagination Buttons */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="px-3 py-1 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    &larr; Trước
                </button>

                <div className="flex gap-1">
                    {getPageNumbers().map(page => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            disabled={isLoading}
                            className={`w-8 h-8 flex items-center justify-center rounded border transition-colors ${
                                currentPage === page
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="px-3 py-1 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Sau &rarr;
                </button>
            </div>
        </div>
    );
}