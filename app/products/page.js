// app/products/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import PaginationControls from '@/components/ui/PaginationControls';

export default function ProductsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- Pagination State ---
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [limit, setLimit] = useState(parseInt(searchParams.get('limit') || '12'));
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [quickViewProductId, setQuickViewProductId] = useState(null);

    const handleOpenQuickView = (productId) => setQuickViewProductId(productId);
    const handleCloseQuickView = () => setQuickViewProductId(null);

    // --- Helper to update URL params ---
    const updateParams = (newPage, newLimit) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage);
        params.set('limit', newLimit);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch with pagination params
            const response = await fetch(`/api/products?page=${page}&limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch products');

            const result = await response.json();

            if (result.data) {
                setProducts(result.data);
                setTotalItems(result.meta.total);
                setTotalPages(result.meta.totalPages);
            } else {
                // Backward compatibility
                setProducts(result);
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // --- Handlers ---
    const handlePageChange = (newPage) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateParams(newPage, limit);
    };

    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1); // Reset to page 1 when changing limit
        updateParams(1, newLimit);
    };

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-extrabold text-center mb-12">Bộ Sưu Tập Của Chúng Tôi</h1>

                {isLoading && products.length === 0 ? (
                    <p className="text-center">Đang tải bộ sưu tập...</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {products.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onQuickViewClick={handleOpenQuickView}
                                />
                            ))}
                        </div>

                        {/* --- Pagination --- */}
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
                )}
            </div>

            <QuickViewModal
                productId={quickViewProductId}
                onClose={handleCloseQuickView}
            />
        </main>
    );
}