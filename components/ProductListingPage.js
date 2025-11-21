// components/ProductListingPage.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import QuickViewModal from '@/components/QuickViewModal';
import PaginationControls from '@/components/ui/PaginationControls'; // --- NEW ---

// @unchanged (updateQueryString helper)
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

    // --- NEW: Pagination State ---
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [limit, setLimit] = useState(parseInt(searchParams.get('limit') || '12'));
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // @unchanged (Filter states)
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || '');
    const [selectedSizes, setSelectedSizes] = useState(searchParams.getAll('size') || []);
    const [selectedColors, setSelectedColors] = useState(searchParams.getAll('color') || []);
    const [availableSizes, setAvailableSizes] = useState([]);
    const [availableColors, setAvailableColors] = useState([]);

    // --- Modal State ---
    const [quickViewProductId, setQuickViewProductId] = useState(null);

    // Fetch products
    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams({
                sort: sortBy,
                page: page.toString(), // --- NEW ---
                limit: limit.toString() // --- NEW ---
            });

            selectedSizes.forEach(s => queryParams.append('size', s));
            selectedColors.forEach(c => queryParams.append('color', c));

            // Combine with fetchUrl which might already have params
            const separator = fetchUrl.includes('?') ? '&' : '?';
            const response = await fetch(`${fetchUrl}${separator}${queryParams.toString()}`);

            if (!response.ok) throw new Error(`${pageType} not found`);

            const data = await response.json();

            // Handle both paginated and non-paginated responses for backward compatibility
            const productList = data.data || data.products || [];
            setProducts(productList);
            setPageInfo(data.category || data.collection || null);

            // --- NEW: Set pagination meta ---
            if (data.meta) {
                setTotalItems(data.meta.total);
                setTotalPages(data.meta.totalPages);
            } else {
                // Fallback if API doesn't support pagination yet
                setTotalItems(productList.length);
                setTotalPages(1);
            }

            // Extract available filters from *current* items (Simplification)
            // Ideally this should come from a separate aggregate API to show ALL options
            const sizes = new Set();
            const colors = new Set();
            productList.forEach(p => {
                p.product_variants.forEach(v => {
                    if (v.size) sizes.add(v.size);
                    if (v.color) colors.add(v.color);
                });
            });
            setAvailableSizes([...sizes].sort());
            setAvailableColors([...colors].sort());

        } catch (error) {
            console.error(`Failed to fetch ${pageType.toLowerCase()} products:`, error);
            setPageInfo(null);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [fetchUrl, pageType, sortBy, selectedSizes, selectedColors, page, limit]);

    // Initial fetch & Page params listener
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // SEO update (unchanged)
    useEffect(() => {
        if (pageInfo) {
            document.title = pageInfo.seo_title || `${pageInfo.name} | ${defaultTitle}`;
            const metaDescriptionTag = document.querySelector('meta[name="description"]');
            const descriptionContent = pageInfo.seo_description || pageInfo.description || `Browse ${pageInfo.name} products at ${defaultTitle}.`;
            if (metaDescriptionTag) {
                metaDescriptionTag.setAttribute('content', descriptionContent);
            }
        }
        return () => {
            document.title = defaultTitle;
        };
    }, [pageInfo, defaultTitle, defaultDescription]);

    // Handlers
    const handleOpenQuickView = (productId) => setQuickViewProductId(productId);
    const handleCloseQuickView = () => setQuickViewProductId(null);

    const handleSortChange = (e) => {
        setSortBy(e.target.value);
        setPage(1); // Reset page on filter change
        updateQueryString(router, pathname, searchParams, { sort: e.target.value, page: 1 });
    };

    const handleSizeChange = (size) => {
        const newSizes = selectedSizes.includes(size) ? selectedSizes.filter(s => s !== size) : [...selectedSizes, size];
        setSelectedSizes(newSizes);
        setPage(1);
        updateQueryString(router, pathname, searchParams, { size: newSizes, page: 1 });
    };

    const handleColorChange = (color) => {
        const newColors = selectedColors.includes(color) ? selectedColors.filter(c => c !== color) : [...selectedColors, color];
        setSelectedColors(newColors);
        setPage(1);
        updateQueryString(router, pathname, searchParams, { color: newColors, page: 1 });
    };

    // --- NEW: Pagination Handlers ---
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

    if (isLoading && !pageInfo && products.length === 0) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><p>Loading...</p></div>;
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-extrabold text-center mb-4">{pageInfo?.name || pageType}</h1>
                <p className="text-center text-gray-400 mb-8 max-w-2xl mx-auto">{pageInfo?.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <aside className="md:col-span-1 bg-gray-800 p-6 rounded-lg self-start sticky top-24">
                        <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Filters</h2>
                        <div className="mb-6">
                            <label htmlFor="sort" className="block text-sm font-medium mb-2">Sort By</label>
                            <select id="sort" value={sortBy} onChange={handleSortChange} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600">
                                <option value="">Default (Newest)</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                                <option value="name-asc">Name: A to Z</option>
                            </select>
                        </div>
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">Size</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {availableSizes.map(size => (
                                    <label key={size} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => handleSizeChange(size)} className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600"/>
                                        <span>{size}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Color</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {availableColors.map(color => (
                                    <label key={color} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={selectedColors.includes(color)} onChange={() => handleColorChange(color)} className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600"/>
                                        <span>{color}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <div className="md:col-span-3">
                        {isLoading && products.length === 0 ? (
                            <p className="text-center py-10">Updating products...</p>
                        ) : products.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {products.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onQuickViewClick={handleOpenQuickView}
                                        />
                                    ))}
                                </div>
                                {/* --- NEW: Pagination Controls --- */}
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
                            <p className="text-center text-gray-500 py-10">No products match your current filters.</p>
                        )}
                    </div>
                </div>
            </div>

            <QuickViewModal
                productId={quickViewProductId}
                onClose={handleCloseQuickView}
            />
        </main>
    );
}