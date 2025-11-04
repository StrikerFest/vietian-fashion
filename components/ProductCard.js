// components/ProductCard.js
import Link from 'next/link';

// MODIFIED: We now accept an 'onQuickViewClick' prop
export default function ProductCard({ product, onQuickViewClick }) {
    // @unchanged (Helper variables)
    const firstVariant = product.product_variants?.[0];
    const imageUrl = product.image_url || 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image';

    // NEW: Handler for the Quick View button click
    const handleQuickViewClick = (e) => {
        e.preventDefault(); // Stop any parent link navigation
        e.stopPropagation(); // Stop the event from bubbling

        // Call the function passed down from the parent component
        if (onQuickViewClick) {
            onQuickViewClick(product.id);
        }
    };

    // MODIFIED: The root is now a div with 'group' and 'relative' for the hover effect
    return (
        <div className="group relative bg-gray-800 rounded-lg overflow-hidden transition-transform transform hover:scale-105">
            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
                {/* MODIFIED: The image is now its own link */}
                <Link href={`/products/${product.id}`} legacyBehavior={false}>
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover object-center"
                    />
                </Link>
            </div>
            <div className="p-4">
                {/* MODIFIED: The name is now its own link */}
                <h3 className="text-lg font-semibold text-white">
                    <Link href={`/products/${product.id}`} legacyBehavior={false} className="hover:text-indigo-400">
                        {product.name}
                    </Link>
                </h3>

                {/* @unchanged (Price logic) */}
                {firstVariant ? (
                    <p className="mt-1 text-md font-medium text-indigo-400">
                        ${firstVariant.price.toFixed(2)}
                    </p>
                ) : (
                    <p className="mt-1 text-md text-gray-500">
                        Unavailable
                    </p>
                )}
            </div>

            {/* NEW: Quick View Button Overlay */}
            {/* This button appears on hover over the 'group' */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleQuickViewClick}
                    className="bg-white text-gray-900 font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105"
                    aria-label={`Quick view for ${product.name}`}
                >
                    Quick View
                </button>
            </div>
        </div>
    );
}