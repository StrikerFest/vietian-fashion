// components/product/ProductGallery.js
'use client';

import Image from 'next/image';

export default function ProductGallery({ imageUrl, name }) {
    return (
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            {/* aspect-w-4 aspect-h-3 sets a container ratio, we use fill inside relative container */}
            <div className="aspect-w-4 aspect-h-3 overflow-hidden rounded-lg relative h-[400px] md:h-[500px]">
                <Image
                    src={imageUrl || 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image'}
                    alt={name}
                    fill
                    priority
                    className="object-cover object-center hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 50vw"
                />
            </div>
            {/* Future: Add thumbnails list here if multiple images exist */}
        </div>
    );
}