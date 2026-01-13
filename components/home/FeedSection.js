// components/home/FeedSection.js
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';

// Sub-component for individual rows
function ProductRow({ title, fetchUrl, viewAllLink, onQuickView }) {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const sliderRef = useRef(null);

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

    const scroll = (direction) => {
        if (sliderRef.current) {
            const { current } = sliderRef;
            const scrollAmount = direction === 'left' ? -300 : 300;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (!isLoading && products.length === 0) return null;

    return (
        <section className="py-8 border-b border-gray-800 last:border-0 group/section">
            <div className="flex justify-between items-end mb-6 px-4 max-w-7xl mx-auto">
                <h3 className="text-2xl font-bold text-white">{title}</h3>
                {viewAllLink && (
                    <Link href={viewAllLink} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                        Xem tất cả &rarr;
                    </Link>
                )}
            </div>

            <div className="relative w-full px-14 md:px-24">
                {/* Scroll Buttons - Bigger and Outside with more Gap */}
                <button 
                    onClick={() => scroll('left')}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-gray-800 hover:bg-indigo-600 text-white p-4 rounded-full shadow-2xl transition-all duration-300 border border-gray-700 hidden md:flex items-center justify-center group/btn cursor-pointer"
                    aria-label="Scroll Left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 group-hover/btn:-translate-x-1 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>

                <button 
                    onClick={() => scroll('right')}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-gray-800 hover:bg-indigo-600 text-white p-4 rounded-full shadow-2xl transition-all duration-300 border border-gray-700 hidden md:flex items-center justify-center group/btn cursor-pointer"
                    aria-label="Scroll Right"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 group-hover/btn:translate-x-1 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>

                {/* 
                   Centering Trick: 
                   - Outer: overflow-x-auto (scroll) + text-center (aligns inline-block children)
                   - Inner: inline-flex (shrinks to content) + text-left (resets text align)
                */}
                <div 
                    ref={sliderRef}
                    className="overflow-x-auto pb-6 snap-x text-center custom-scrollbar scroll-smooth"
                >
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

// Full Width Banner Component
function BannerRow({ image_url, title, buttons }) {
    if (!image_url) return null;

    return (
        <section className="relative w-full h-[400px] md:h-[500px] my-8 overflow-hidden bg-gray-900 group">
            <Image
                src={image_url}
                alt={title || 'Banner'}
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40"></div>
            
            <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4">
                {title && (
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-8 tracking-tight drop-shadow-lg max-w-3xl">
                        {title}
                    </h2>
                )}
                
                {buttons && buttons.length > 0 && (
                    <div className="flex flex-wrap gap-4 justify-center">
                        {buttons.map((btn, idx) => (
                            <Link
                                key={idx}
                                href={btn.link || '#'}
                                className={`px-8 py-3 font-bold rounded-full transition-all shadow-xl hover:-translate-y-1 ${
                                    btn.style === 'outline' 
                                        ? 'border-2 border-white text-white hover:bg-white hover:text-gray-900' 
                                        : btn.style === 'white'
                                        ? 'bg-white text-gray-900 hover:bg-gray-100'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 border-2 border-transparent'
                                }`}
                            >
                                {btn.text}
                            </Link>
                        ))}
                    </div>
                )}
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

                if (row.type === 'banner_row') {
                    return (
                        <BannerRow 
                            key={row.id}
                            image_url={row.image_url}
                            title={row.title}
                            buttons={row.buttons}
                        />
                    );
                }

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