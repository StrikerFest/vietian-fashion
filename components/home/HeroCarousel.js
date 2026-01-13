// components/home/HeroCarousel.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
        <div className="relative w-full h-[350px] md:h-[450px] overflow-hidden bg-gray-900">
            {/* Slides */}
            {banners.map((banner, index) => (
                <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                        index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                >
                    {/* Next.js Image Component */}
                    <Image
                        src={banner.image_url}
                        alt={banner.title}
                        fill
                        priority={index === 0} // Prioritize loading the first image
                        className="object-cover object-center"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40"></div>

                    {/* Full Banner Link (Background Click) */}
                    {banner.link && (
                        <Link 
                            href={banner.link} 
                            className="absolute inset-0 z-10" 
                            aria-label={banner.title}
                        />
                    )}

                    {/* Content */}
                    <div className="relative z-20 h-full flex flex-col justify-center items-center text-center px-4 pointer-events-none">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg max-w-4xl">
                            {banner.title}
                        </h2>
                        
                        {/* Buttons Grid */}
                        {banner.buttons && banner.buttons.length > 0 && (
                            <div className="flex flex-wrap gap-4 justify-center pointer-events-auto">
                                {banner.buttons.map((btn, idx) => (
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

                        {/* Fallback Legacy Button if no new buttons but link exists */}
                        {(!banner.buttons || banner.buttons.length === 0) && banner.link && (
                            <div className="pointer-events-auto">
                                <Link
                                    href={banner.link}
                                    className="px-8 py-3 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-colors shadow-xl"
                                >
                                    Mua ngay
                                </Link>
                            </div>
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