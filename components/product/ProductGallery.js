// components/product/ProductGallery.js
'use client';

export default function ProductGallery({ imageUrl, name }) {
    return (
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="aspect-w-4 aspect-h-3 overflow-hidden rounded-lg">
                <img
                    src={imageUrl || 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image'}
                    alt={name}
                    className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                />
            </div>
            {/* Future: Add thumbnails list here if multiple images exist */}
        </div>
    );
}