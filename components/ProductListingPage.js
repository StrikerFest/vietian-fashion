// components/ProductListingPage.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import PaginationControls from '@/components/ui/PaginationControls';
import QuickViewModal from '@/components/QuickViewModal';

// Helper to update URL
function updateQueryString(router, pathname, currentParams, newParams) {
    const updatedParams = new URLSearchParams(currentParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            updatedParams.delete(key);
        } else if (Array.isArray(value)) {
            updatedParams.delete(key);
            value.forEach(v => updatedParams.append(key, v));
        } else {
            updatedParams.set(key, value);
        }
    });
    router.push(`${pathname}?${updatedParams.toString()}`, { scroll: false });
}

export default function ProductListingPage({ fetchUrl, pageType, defaultTitle, defaultDescription }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [products, setProducts] = useState([]);
    const [pageInfo, setPageInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [limit, setLimit] = useState(parseInt(searchParams.get('limit') || '12'));
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // --- NEW: Dynamic Attribute Filters ---
    const [attributeGroups, setAttributeGroups] = useState([]); // Metadata for sidebar (headers)
    const [selectedFilters, setSelectedFilters] = useState({}); // { "color-slug": ["red-slug"], "size-slug": ["m-slug"] }
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || '');
    const [quickViewProductId, setQuickViewProductId] = useState(null);

    // 1. Load Filter Definitions (Attributes) from DB
    useEffect(() => {
        const fetchAttributes = async () => {
            try {
                // Fetch categories that are attributes (filters)
                // Note: You might want to cache this response or fetch it server-side in a real app
                const res = await fetch('/api/categories?type=attribute&mode=public');
                const data = await res.json();

                // Organize into Parent -> Options
                const groups = [];
                const map = {};

                // First pass: Create headers
                data.forEach(item => {
                    if (!item.parent_id) {
                        map[item.id] = { ...item, options: [] };
                        groups.push(map[item.id]);
                    }
                });

                // Second pass: Assign options to headers
                data.forEach(item => {
                    if (item.parent_id && map[item.parent_id]) {
                        map[item.parent_id].options.push(item);
                    }
                });

                setAttributeGroups(groups);
            } catch (err) {
                console.error("Failed to load filters:", err);
            }
        };
        fetchAttributes();
    }, []);

    // 2. Initialize selected filters from URL
    useEffect(() => {
        const currentFilters = {};
        for (const [key, value] of searchParams.entries()) {
            if (['page', 'limit', 'sort'].includes(key)) continue;
            if (!currentFilters[key]) currentFilters[key] = [];
            currentFilters[key].push(value);
        }
        setSelectedFilters(currentFilters);
    }, [searchParams]);

    // 3. Fetch Products
    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams({
                sort: sortBy,
                page: page.toString(),
                limit: limit.toString()
            });

            // Append selected filters to query
            // Note: The API needs to be smart enough to handle generic keys like ?color=red
            // or you might need to map these to a specific 'attribute' param in your API.
            // For now, we pass them as-is, assuming your API ignores unknown params
            // or you add specific logic in GET /api/products to loop through params.
            Object.entries(selectedFilters).forEach(([key, values]) => {
                values.forEach(v => queryParams.append(key, v));
            });

            const separator = fetchUrl.includes('?') ? '&' : '?';
            const response = await fetch(`${fetchUrl}${separator}${queryParams.toString()}`);

            if (!response.ok) throw new Error('Failed to load products');

            const data = await response.json();

            // Support both data structures
            setProducts(data.data || data.products || []);
            setPageInfo(data.category || data.collection || null);

            if (data.meta) {
                setTotalItems(data.meta.total);
                setTotalPages(data.meta.totalPages);
            }
        } catch (error) {
            console.error("Product fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [fetchUrl, sortBy, page, limit, selectedFilters]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Handlers
    const handleFilterChange = (groupSlug, optionSlug) => {
        const currentOptions = selectedFilters[groupSlug] || [];
        let newOptions;

        if (currentOptions.includes(optionSlug)) {
            newOptions = currentOptions.filter(o => o !== optionSlug);
        } else {
            newOptions = [...currentOptions, optionSlug];
        }

        const newFilters = { ...selectedFilters, [groupSlug]: newOptions };
        setSelectedFilters(newFilters);
        setPage(1);

        // Update URL
        updateQueryString(router, pathname, searchParams, { [groupSlug]: newOptions, page: 1 });
    };

    const handleSortChange = (e) => {
        setSortBy(e.target.value);
        setPage(1);
        updateQueryString(router, pathname, searchParams, { sort: e.target.value, page: 1 });
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateQueryString(router, pathname, searchParams, { page: newPage });
    };

    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
        updateQueryString(router, pathname, searchParams, { limit: newLimit, page: 1 });
    };

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-extrabold text-center mb-4">{pageInfo?.name || pageType}</h1>
                <p className="text-center text-gray-400 mb-8 max-w-2xl mx-auto">{pageInfo?.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Sidebar Filters */}
                    <aside className="md:col-span-1 bg-gray-800 p-6 rounded-lg self-start sticky top-24 border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Bộ lọc</h2>

                        <div className="mb-6">
                            <label htmlFor="sort" className="block text-sm font-medium mb-2 text-gray-400">Sắp xếp theo</label>
                            <select id="sort" value={sortBy} onChange={handleSortChange} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="">Mặc định (Mới nhất)</option>
                                <option value="price-asc">Giá: Thấp đến Cao</option>
                                <option value="price-desc">Giá: Cao đến Thấp</option>
                                <option value="name-asc">Tên: A đến Z</option>
                            </select>
                        </div>

                        {/* --- Dynamic Attribute Groups --- */}
                        {attributeGroups.map(group => (
                            <div key={group.id} className="mb-6">
                                <h3 className="font-semibold mb-2 text-indigo-300 uppercase text-xs tracking-wider">
                                    {group.name}
                                </h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {group.options.map(option => {
                                        const isChecked = (selectedFilters[group.slug] || []).includes(option.slug);

                                        // Render based on display_style
                                        if (group.display_style === 'swatch') {
                                            return (
                                                <div key={option.id} className="inline-block mr-2 mb-1">
                                                    <button
                                                        onClick={() => handleFilterChange(group.slug, option.slug)}
                                                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${isChecked ? 'border-white ring-2 ring-indigo-500' : 'border-gray-600'}`}
                                                        style={{ backgroundColor: option.value || '#ccc' }}
                                                        title={option.name}
                                                    />
                                                </div>
                                            );
                                        }

                                        // Default Checkbox Style
                                        return (
                                            <label key={option.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700/50 p-1 rounded transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleFilterChange(group.slug, option.slug)}
                                                    className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-gray-300">{option.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {attributeGroups.length === 0 && (
                            <p className="text-xs text-gray-500 italic">Không có bộ lọc nào.</p>
                        )}
                    </aside>

                    {/* Product Grid */}
                    <div className="md:col-span-3">
                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
                                {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-800 h-96 rounded-lg"></div>)}
                            </div>
                        ) : products.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {products.map(product => (
                                        <ProductCard key={product.id} product={product} onQuickViewClick={setQuickViewProductId} />
                                    ))}
                                </div>

                                <PaginationControls
                                    currentPage={page}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    limit={limit}
                                    onPageChange={handlePageChange}
                                    onLimitChange={handleLimitChange}
                                    isLoading={isLoading}
                                />
                            </>
                        ) : (
                            <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-lg">
                                <p className="text-gray-500 text-lg">Không có sản phẩm nào phù hợp với bộ lọc của bạn.</p>
                                <button onClick={() => { setSelectedFilters({}); setSortBy(''); updateQueryString(router, pathname, searchParams, {}); }} className="mt-4 text-indigo-400 hover:underline">Xóa tất cả bộ lọc</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <QuickViewModal productId={quickViewProductId} onClose={() => setQuickViewProductId(null)} />
        </main>
    );
}