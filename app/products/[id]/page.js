// app/products/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation'; // Added hooks
import { useCart } from '@/context/CartContext';
import ProductGallery from '@/components/product/ProductGallery';
import VariantSelector from '@/components/product/VariantSelector';
import ProductReviews from '@/components/product/ProductReviews';
import ProductOptions from '@/components/product/ProductOptions';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function ProductDetailPage() {
    const params = useParams();
    const { id } = params;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToCart } = useCart();
    const { addToast } = useToast(); // --- NEW ---

    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState(null);

    // Custom Options State
    const [customOptions, setCustomOptions] = useState({});
    const [areOptionsValid, setAreOptionsValid] = useState(true);

    // 1. Fetch Product
    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const response = await fetch(`/api/products/${id}`);
                if (!response.ok) throw new Error('Product not found');
                const data = await response.json();
                setProduct(data);

                // 2. Initialize Variant from URL or Default
                if (data.product_variants?.length > 0) {
                    const urlVariantId = searchParams.get('variant');
                    const foundVariant = data.product_variants.find(v => v.id.toString() === urlVariantId);

                    if (foundVariant) {
                        setSelectedVariant(foundVariant);
                    } else {
                        // Default to first
                        setSelectedVariant(data.product_variants[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch product:", error);
                setProduct(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProduct();
    }, [id]); // Intentionally excludes searchParams to prevent loop on URL update

    // 3. Sync Selection to URL
    const handleVariantSelect = (variant) => {
        setSelectedVariant(variant);

        // Update URL without reloading page
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('variant', variant.id);
        router.replace(`?${newParams.toString()}`, { scroll: false });
    };

    useEffect(() => {
        if (product) {
            document.title = product.seo_title || `${product.name} | AI Fashion`;
        }
    }, [product]);

    const handleAddToCart = () => {
        if (product && selectedVariant) {
            if (!areOptionsValid) {
                addToast("Please fill in all required options.", 'error'); // --- FIXED: Replaced alert() ---
                return;
            }
            addToCart(product, selectedVariant, customOptions);
        }
    };

    if (isLoading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading product...</div>;
    if (!product) return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold">Product not found</h1>
            <Link href="/products" className="text-indigo-400 hover:underline">Back to Collection</Link>
        </div>
    );

    const stockOnHand = selectedVariant?.inventory_levels?.[0]?.on_hand || 0;
    const isOutOfStock = stockOnHand <= 0;

    const optionsPrice = Object.values(customOptions).reduce((sum, opt) => sum + (opt.priceModifier || 0), 0);
    const finalPrice = (selectedVariant?.price || 0) + optionsPrice;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <nav className="text-sm text-gray-400 mb-8">
                    <Link href="/products" className="hover:text-white">Products</Link>
                    <span className="mx-2">/</span>
                    <span className="text-white">{product.name}</span>
                </nav>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                    <ProductGallery imageUrl={product.image_url} name={product.name} />

                    <div className="flex flex-col">
                        <h1 className="text-4xl font-extrabold mb-2 text-white">{product.name}</h1>

                        <div className="mb-6 flex items-baseline gap-4">
                            <p className="text-3xl font-bold text-indigo-400">
                                ${finalPrice.toFixed(2)}
                            </p>
                            {isOutOfStock && (
                                <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs font-bold uppercase rounded border border-red-900/50">
                                    Out of Stock
                                </span>
                            )}
                        </div>

                        <div className="prose prose-invert text-gray-400 mb-8 leading-relaxed">
                            {product.description}
                        </div>

                        <VariantSelector
                            variants={product.product_variants}
                            selectedVariant={selectedVariant}
                            onSelect={handleVariantSelect} // Use new handler
                        />

                        {selectedVariant && (
                            <ProductOptions
                                productId={product.id}
                                variantId={selectedVariant.id} // Pass ID instead of price
                                onChange={setCustomOptions}
                                setIsValid={setAreOptionsValid}
                            />
                        )}

                        <div className="mt-auto pt-6 border-t border-gray-700">
                            <button
                                onClick={handleAddToCart}
                                disabled={isOutOfStock || !selectedVariant}
                                className={`w-full py-4 px-6 rounded-lg text-lg font-bold transition-all duration-200 ${
                                    isOutOfStock || !selectedVariant
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:shadow-indigo-900/30 shadow-md'
                                }`}
                            >
                                {!selectedVariant ? 'Select an Option' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                            </button>

                            {selectedVariant && !isOutOfStock && (
                                <p className="text-center text-xs text-green-400 mt-3 flex items-center justify-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                                    In Stock ({stockOnHand} units ready to ship)
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <ProductReviews productId={product.id} />
            </div>
        </main>
    );
}