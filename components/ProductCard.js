// components/ProductCard.js
import Link from 'next/link';

// This component expects a 'product' object as a prop
export default function ProductCard({ product }) {
    // Find the first variant to display a price
    const firstVariant = product.product_variants?.[0];

    // Placeholder image if none is available (we'll add real images later)
    const imageUrl = product.image_url || 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image';

    return (
        <Link href={`/products/${product.id}`} className="block group">
            <div className="bg-gray-800 rounded-lg overflow-hidden transition-transform transform group-hover:scale-105">
                <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
                    {/* In a real app, you would use Next/Image here */}
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover object-center"
                    />
                </div>
                <div className="p-4">
                    <h3 className="text-lg font-semibold text-white">{product.name}</h3>
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
            </div>
        </Link>
    );
}