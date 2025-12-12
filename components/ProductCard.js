// components/ProductCard.js
import Link from 'next/link';
import Image from 'next/image';
import WishlistButton from '@/components/product/WishlistButton';

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

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden transition-transform transform hover:scale-105 flex flex-col relative">
            <div className="absolute top-3 right-3 z-10">
                <WishlistButton productId={product.id}/>
            </div>
            {/* Added relative positioning for Next.js Image fill */}
            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden relative h-64 sm:h-72">
                <Link href={`/products/${product.id}`} legacyBehavior={false} className="block w-full h-full">
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover object-center"
                    />
                </Link>
            </div>

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
                        Không có sẵn
                    </p>
                )}

                <button
                    onClick={handleQuickViewClick}
                    className="mt-auto w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                    aria-label={`Xem nhanh ${product.name}`}
                >
                    Xem nhanh
                </button>
            </div>
        </div>
    );
}