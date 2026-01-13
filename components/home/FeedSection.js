// components/home/FeedSection.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';

// Sub-component for individual rows
function ProductRow({ title, fetchUrl, viewAllLink, onQuickView }) {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(fetchUrl);
                const data = await res.json();
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
            <div className="flex justify-between items-end mb-6 px-4 max-w-7xl mx-auto">
                <h3 className="text-2xl font-bold text-white">{title}</h3>
                {viewAllLink && (
                    <Link href={viewAllLink} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                        Xem tất cả &rarr;
                    </Link>
                )}
            </div>

            <div className="relative w-full">
                {/* 
                   Centering Trick: 
                   - Outer: overflow-x-auto (scroll) + text-center (aligns inline-block children)
                   - Inner: inline-flex (shrinks to content) + text-left (resets text align)
                */}
                <div className="overflow-x-auto pb-6 snap-x text-center hide-scrollbar">
                    <div className="inline-flex gap-6 px-4 text-left mx-auto">
                        {isLoading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="min-w-[260px] h-[400px] bg-gray-800 rounded-lg animate-pulse flex-shrink-0"></div>
                            ))
                        ) : (
                            <>
                                {products.map(product => (
                                    <div key={product.id} className="min-w-[260px] w-[260px] flex-shrink-0 snap-start">
                                        <ProductCard product={product} onQuickViewClick={onQuickView} />
                                    </div>
                                ))}
                                
                                {/* View More Card at the end */}
                                {viewAllLink && (
                                    <Link 
                                        href={viewAllLink} 
                                        className="min-w-[260px] w-[260px] flex-shrink-0 snap-start flex flex-col items-center justify-center bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-gray-800 transition-all group cursor-pointer"
                                    >
                                        <span className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:scale-110 transition-all mb-4 shadow-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                            </svg>
                                        </span>
                                        <span className="text-gray-300 font-bold text-lg group-hover:text-white">Xem Thêm</span>
                                        <span className="text-gray-500 text-sm mt-1">{title}</span>
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
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
                const limit = row.limit || 8;

                if (row.type === 'collection_row' && row.target_id) {
                    return (
                        <ProductRow
                            key={row.id}
                            {...commonProps}
                            title={row.title || 'Bộ sưu tập'}
                            fetchUrl={`/api/products?collection_id=${row.target_id}&limit=${limit}&sort=position-desc`}
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
                            fetchUrl={`/api/products?category_id=${row.target_id}&limit=${limit}&sort=position-desc`}
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
                            fetchUrl={`/api/products?limit=${limit}&sort=position-desc`}
                            viewAllLink="/products"
                        />
                    );
                }
                return null;
            })}
        </div>
    );
}