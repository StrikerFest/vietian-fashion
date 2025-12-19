// components/product/ProductGallery.js
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ProductGallery({ images = [], name }) {
    // Fallback if no images provided
    const displayImages = images && images.length > 0
        ? images
        : [{ image_url: 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image', alt_text: name }];

    const [activeIndex, setActiveIndex] = useState(0);

    // Reset index if images change (e.g., in QuickView when switching products)
    useEffect(() => {
        setActiveIndex(0);
    }, [images]);

    const handleThumbnailClick = (index) => {
        setActiveIndex(index);
    };

    const handleNext = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
    };

    const handlePrev = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Main Carousel Image */}
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden relative w-full aspect-[4/3] md:h-[500px]">
                <Image
                    src={displayImages[activeIndex].image_url}
                    alt={displayImages[activeIndex].alt_text || name}
                    fill
                    priority
                    className="object-cover object-center transition-all duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                />

                {/* Navigation Arrows */}
                {displayImages.length > 1 && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-10 transition-colors"
                        >
                            &#10094;
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-10 transition-colors"
                        >
                            &#10095;
                        </button>
                    </>
                )}

                {/* Image Counter Badge */}
                {displayImages.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {activeIndex + 1} / {displayImages.length}
                    </div>
                )}
            </div>

            {/* Thumbnails Grid */}
            {displayImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600">
                    {displayImages.map((img, idx) => (
                        <button
                            key={img.id || idx}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleThumbnailClick(idx); }}
                            className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                                activeIndex === idx ? 'border-indigo-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                            <Image
                                src={img.image_url}
                                alt={`Thumbnail ${idx}`}
                                fill
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}