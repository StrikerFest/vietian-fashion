// app/products/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import ProductGallery from '@/components/product/ProductGallery';
import VariantSelector from '@/components/product/VariantSelector';
import ProductReviews from '@/components/product/ProductReviews';
import ProductOptions from '@/components/product/ProductOptions';
import ProductDetails from '@/components/product/ProductDetails';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/utils/format';
// [MODIFIED] Import shared helper
import { getVariantStockStatus } from '@/utils/product-helper';

export default function ProductDetailPage() {
    const params = useParams();
    const { id } = params;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToCart } = useCart();
    const { addToast } = useToast();

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
            } catch (error) {
                console.error("Failed to fetch product:", error);
                setProduct(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    // 2. Sync Variant Selection
    useEffect(() => {
        if (!product || !product.product_variants || product.product_variants.length === 0) return;

        const urlVariantId = searchParams.get('variant');
        let targetVariant = null;

        if (urlVariantId) {
            targetVariant = product.product_variants.find(v => v.id.toString() === urlVariantId);
        }

        if (!targetVariant && !selectedVariant) {
            targetVariant = product.product_variants[0];
        }

        if (targetVariant && targetVariant.id !== selectedVariant?.id) {
            setSelectedVariant(targetVariant);
        }
    }, [product, searchParams, selectedVariant]);

    // 3. Handle User Selection
    const handleVariantSelect = (variant) => {
        setSelectedVariant(variant);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('variant', variant.id);
        router.replace(`?${newParams.toString()}`, { scroll: false });
    };

    useEffect(() => {
        if (product) {
            document.title = product.seo_title || `${product.name} | Vietian Fashion`;
        }
    }, [product]);

    const handleAddToCart = () => {
        if (product && selectedVariant) {
            if (!areOptionsValid) {
                addToast("Vui lòng điền tất cả các tùy chọn bắt buộc.", 'error');
                return;
            }
            addToCart(product, selectedVariant, customOptions);
        }
    };

    // [MODIFIED] Use shared helper
    const { count: stockOnHand, isOutOfStock } = getVariantStockStatus(selectedVariant);

    if (isLoading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Đang tải sản phẩm...</div>;
    if (!product) return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold">Không tìm thấy sản phẩm</h1>
            <Link href="/products" className="text-indigo-400 hover:underline">Quay lại bộ sưu tập</Link>
        </div>
    );

    const optionsPrice = Object.values(customOptions).reduce((sum, opt) => sum + (opt.priceModifier || 0), 0);
    const finalPrice = (selectedVariant?.price || 0) + optionsPrice;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <nav className="text-sm text-gray-400 mb-8">
                    <Link href="/products" className="hover:text-white">Sản phẩm</Link>
                    <span className="mx-2">/</span>
                    <span className="text-white">{product.name}</span>
                </nav>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                    <ProductGallery
                        images={product.product_images}
                        name={product.name}
                    />

                    <div className="flex flex-col">
                        <h1 className="text-4xl font-extrabold mb-2 text-white">{product.name}</h1>

                        <div className="mb-6 flex items-baseline gap-4">
                            <p className="text-3xl font-bold text-indigo-400">
                                {formatCurrency(finalPrice)}
                            </p>
                            {isOutOfStock && (
                                <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs font-bold uppercase rounded border border-red-900/50">
                                    Hết hàng
                                </span>
                            )}
                        </div>

                        <div className="prose prose-invert text-gray-400 mb-8 leading-relaxed">
                            {product.description}
                        </div>

                        <VariantSelector
                            variants={product.product_variants}
                            selectedVariant={selectedVariant}
                            onSelect={handleVariantSelect}
                        />

                        {selectedVariant && (
                            <ProductOptions
                                productId={product.id}
                                variantId={selectedVariant.id}
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
                                {!selectedVariant ? 'Chọn một tùy chọn' : isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
                            </button>

                            {selectedVariant && !isOutOfStock && (
                                <p className="text-center text-xs text-green-400 mt-3 flex items-center justify-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                                    Còn hàng ({stockOnHand} sản phẩm sẵn sàng giao)
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <ProductDetails product={product} />

                <ProductReviews productId={product.id} />
            </div>
        </main>
    );
}