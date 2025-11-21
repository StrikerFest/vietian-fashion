// components/ProductCard.js
import Link from 'next/link';
import WishlistButton from '@/components/product/WishlistButton'; // Import

export default function ProductCard({ product, onQuickViewClick }) {
    const firstVariant = product.product_variants?.[0];
    const imageUrl = product.image_url || 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image';

    const handleQuickViewClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (onQuickViewClick) {
            onQuickViewClick(product.id);
        }
    };

    // --- MODIFIED: Removed 'group' and 'relative' classes ---
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden transition-transform transform hover:scale-105 flex flex-col">
            <div className="absolute top-3 right-3 z-10">
                <WishlistButton productId={product.id}/>
            </div>
            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
                <Link href={`/products/${product.id}`} legacyBehavior={false}>
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover object-center"
                    />
                </Link>
            </div>

            {/* --- MODIFIED: Added flex-grow and flex container to push button to bottom --- */}
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold text-white">
                    <Link href={`/products/${product.id}`} legacyBehavior={false} className="hover:text-indigo-400">
                        {product.name}
                    </Link>
                </h3>

                {firstVariant ? (
                    <p className="mt-1 text-md font-medium text-indigo-400">
                        ${firstVariant.price.toFixed(2)}
                    </p>
                ) : (
                    <p className="mt-1 text-md text-gray-500">
                        Unavailable
                    </p>
                )}

                {/* --- NEW: Quick View Button (visible by default) --- */}
                {/* Added 'mt-auto' to push it to the bottom of the card */}
                <button
                    onClick={handleQuickViewClick}
                    className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                    aria-label={`Quick view for ${product.name}`}
                >
                    Quick View
                </button>
            </div>

            {/* --- REMOVED: The entire overlay div that previously existed here --- */}
        </div>
    );
}