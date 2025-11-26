// components/home/HeroCarousel.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HeroCarousel({ banners }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-rotate
    useEffect(() => {
        if (!banners || banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [banners]);

    if (!banners || banners.length === 0) return null;

    return (
        <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-gray-900">
            {/* Slides */}
            {banners.map((banner, index) => (
                <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                        index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                >
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url('${banner.image_url}')` }}
                    >
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/40"></div>
                    </div>

                    {/* Content */}
                    <div className="relative z-20 h-full flex flex-col justify-center items-center text-center px-4">
                        <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg">
                            {banner.title}
                        </h2>
                        {banner.link && (
                            <Link
                                href={banner.link}
                                className="px-8 py-3 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-colors shadow-xl"
                            >
                                Shop Now
                            </Link>
                        )}
                    </div>
                </div>
            ))}

            {/* Indicators */}
            {banners.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                    {banners.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                idx === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}