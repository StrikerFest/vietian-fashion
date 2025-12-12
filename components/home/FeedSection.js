// components/home/FeedSection.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';

// Sub-component for individual rows to handle their own fetching
function ProductRow({ title, fetchUrl, viewAllLink, onQuickView }) {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(fetchUrl);
                const data = await res.json();
                // Handle different API response structures (standard list vs { data: [] })
                setProducts(Array.isArray(data) ? data : (data.data || data.products || []));
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [fetchUrl]);

    if (!isLoading && products.length === 0) return null;

    return (
        <section className="py-8 border-b border-gray-800 last:border-0">
            <div className="flex justify-between items-end mb-6 px-4">
                <h3 className="text-2xl font-bold text-white">{title}</h3>
                {viewAllLink && (
                    <Link href={viewAllLink} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                        Xem tất cả &rarr;
                    </Link>
                )}
            </div>

            <div className="relative">
                {/* Horizontal Scroll Container */}
                <div className="flex overflow-x-auto gap-6 px-4 pb-4 snap-x">
                    {isLoading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="min-w-[250px] h-80 bg-gray-800 rounded-lg animate-pulse flex-shrink-0"></div>
                        ))
                    ) : (
                        products.map(product => (
                            <div key={product.id} className="min-w-[260px] w-[260px] flex-shrink-0 snap-start">
                                <ProductCard product={product} onQuickViewClick={onQuickView} />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

export default function FeedSection({ layoutOrder, onQuickView }) {
    if (!layoutOrder || layoutOrder.length === 0) return null;

    return (
        <div className="space-y-4">
            {layoutOrder.map((row) => {
                const commonProps = { onQuickView };

                if (row.type === 'collection_row' && row.target_id) {
                    return (
                        <ProductRow
                            key={row.id}
                            {...commonProps}
                            title={row.title || 'Bộ sưu tập'}
                            fetchUrl={`/api/products?collection_id=${row.target_id}&limit=8&sort=position-desc`}
                            viewAllLink={`/products?collection_id=${row.target_id}`}
                        />
                    );
                }
                if (row.type === 'category_row' && row.target_id) {
                    return (
                        <ProductRow
                            key={row.id}
                            {...commonProps}
                            title={row.title || 'Danh mục'}
                            fetchUrl={`/api/products?category_id=${row.target_id}&limit=8&sort=position-desc`}
                            viewAllLink={`/products?category_id=${row.target_id}`}
                        />
                    );
                }
                if (row.type === 'featured_grid') {
                    return (
                        <ProductRow
                            key={row.id}
                            {...commonProps}
                            title={row.title || 'Nổi bật'}
                            fetchUrl={`/api/products?limit=${row.limit || 8}&sort=position-desc`}
                            viewAllLink="/products"
                        />
                    );
                }
                return null;
            })}
        </div>
    );
}