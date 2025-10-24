// app/collections/[slug]/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';

// Helper function (same as in CategoryPage)
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

export default function CollectionPage(props) {
    const { slug } = props.params;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [products, setProducts] = useState([]);
    const [collectionInfo, setCollectionInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- State for filters and sorting ---
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || '');
    const [selectedSizes, setSelectedSizes] = useState(searchParams.getAll('size') || []);
    const [selectedColors, setSelectedColors] = useState(searchParams.getAll('color') || []);

    // --- State for available filters ---
    const [availableSizes, setAvailableSizes] = useState([]);
    const [availableColors, setAvailableColors] = useState([]);

    const fetchCollectionProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams({
                sort: sortBy,
                size: selectedSizes,
                color: selectedColors
            });
             queryParams.forEach((value, key) => {
                 if (!value || (Array.isArray(value) && value.length === 0)) queryParams.delete(key);
             });

            const response = await fetch(`/api/products/collection/${slug}?${queryParams.toString()}`);

            if (!response.ok) throw new Error('Collection not found');

            const data = await response.json();
            setCollectionInfo(data.collection);
            setProducts(data.products || []);

            // Derive filters
            const sizes = new Set();
            const colors = new Set();
            (data.products || []).forEach(p => {
                p.product_variants.forEach(v => {
                    if (v.size) sizes.add(v.size);
                    if (v.color) colors.add(v.color);
                });
            });
            setAvailableSizes([...sizes].sort());
            setAvailableColors([...colors].sort());

        } catch (error) {
            console.error("Failed to fetch collection products:", error);
            setCollectionInfo(null);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [slug, sortBy, selectedSizes, selectedColors]);

    useEffect(() => {
        if (slug) {
            fetchCollectionProducts();
        }
    }, [fetchCollectionProducts, slug]);

    // --- Handlers for filter/sort changes ---
    const handleSortChange = (e) => {
        const newSortBy = e.target.value;
        setSortBy(newSortBy);
        updateQueryString(router, pathname, searchParams, { sort: newSortBy });
    };

    const handleSizeChange = (size) => {
        const newSizes = selectedSizes.includes(size)
            ? selectedSizes.filter(s => s !== size)
            : [...selectedSizes, size];
        setSelectedSizes(newSizes);
        updateQueryString(router, pathname, searchParams, { size: newSizes });
    };

    const handleColorChange = (color) => {
        const newColors = selectedColors.includes(color)
            ? selectedColors.filter(c => c !== color)
            : [...selectedColors, color];
        setSelectedColors(newColors);
        updateQueryString(router, pathname, searchParams, { color: newColors });
    };

    if (!collectionInfo && !isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center text-center p-8">
                <h1 className="text-4xl font-bold mb-4">Collection Not Found</h1>
                <p className="text-gray-400 mb-6">Sorry, we couldn't find the collection you were looking for.</p>
                <Link href="/products" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg">
                    Browse All Products
                </Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-extrabold text-center mb-4">{collectionInfo?.name}</h1>
                <p className="text-center text-gray-400 mb-8 max-w-2xl mx-auto">{collectionInfo?.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* --- Filters Sidebar (Identical to CategoryPage) --- */}
                    <aside className="md:col-span-1 bg-gray-800 p-6 rounded-lg self-start sticky top-24">
                        <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Filters</h2>
                        {/* Sort Dropdown */}
                        <div className="mb-6">
                             <label htmlFor="sort" className="block text-sm font-medium mb-2">Sort By</label>
                             <select id="sort" value={sortBy} onChange={handleSortChange} className="w-full bg-gray-700 p-2 rounded-md border border-gray-600">
                                 <option value="">Default (Newest)</option>
                                 <option value="price-asc">Price: Low to High</option>
                                 <option value="price-desc">Price: High to Low</option>
                                 <option value="name-asc">Name: A to Z</option>
                             </select>
                         </div>
                        {/* Size Filters */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">Size</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {availableSizes.map(size => (
                                    <label key={size} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => handleSizeChange(size)} className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"/>
                                        <span>{size}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* Color Filters */}
                        <div>
                            <h3 className="font-semibold mb-2">Color</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {availableColors.map(color => (
                                    <label key={color} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={selectedColors.includes(color)} onChange={() => handleColorChange(color)} className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"/>
                                        <span>{color}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* --- Product Grid (Identical to CategoryPage) --- */}
                    <div className="md:col-span-3">
                        {isLoading ? (
                            <p className="text-center py-10">Updating products...</p>
                        ) : products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {products.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-10">No products match your current filters in this collection.</p>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}