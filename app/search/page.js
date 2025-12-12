// app/search/page.js
'use client';

import {useState, useEffect} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';

export default function SearchPage() {
    const searchParams = useSearchParams();

    // State
    const [results, setResults] = useState({products: [], collections: [], attributes: []});
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewProductId, setQuickViewProductId] = useState(null);

    // Parse Query
    const queryText = searchParams.get('q') || '';
    const rawAttrs = searchParams.get('attrs');
    const mode = searchParams.get('mode') || 'semantic'; // Default to semantic if missing

    useEffect(() => {
        const performSearch = async () => {
            setIsLoading(true);
            try {
                // Construct Payload
                let payload = {
                    query: queryText,
                    mode: mode // <--- Pass the mode to backend
                };

                // Handle AI attributes if in semantic mode
                if (rawAttrs && mode === 'semantic') {
                    try {
                        payload.attributes = JSON.parse(rawAttrs);
                        payload.generalPrompt = queryText;
                    } catch (e) {
                        console.error("Error parsing attributes", e);
                    }
                }

                const res = await fetch('/api/recommendations', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Tìm kiếm thất bại');
                const data = await res.json();
                setResults({
                    products: data.products || [],
                    collections: data.collections || [],
                    attributes: data.attributes || []
                });

            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        if (queryText || rawAttrs) {
            performSearch();
        } else {
            setIsLoading(false);
        }
    }, [queryText, rawAttrs, mode]);

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-sm text-gray-400 hover:text-white">&larr; Quay lại Trang chủ</Link>
                    <h1 className="text-3xl font-bold mt-2">
                        {mode === 'keyword' ? 'Kết quả từ khóa' : 'Gợi ý từ AI'} cho <span className="text-indigo-400">{`"${queryText}"`}</span>
                    </h1>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 animate-pulse">
                        {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-800 h-96 rounded-lg"></div>)}
                    </div>
                ) : (
                    <>
                        {/* Suggestions Grid (Collections/Categories) */}
                        {(results.collections.length > 0 || results.attributes.length > 0) && (
                            <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                                {results.collections.map(c => (
                                    <Link key={c.id} href={`/collections/${c.slug}`} className="bg-gray-800 p-6 rounded-xl border border-indigo-500/30 hover:bg-gray-700 transition-colors block">
                                        <span className="text-xs font-bold text-indigo-400 uppercase">Bộ sưu tập</span>
                                        <h3 className="text-xl font-bold text-white">{c.name}</h3>
                                    </Link>
                                ))}
                                {results.attributes.map(a => (
                                    <Link key={a.id} href={`/categories/${a.slug}`} className="bg-gray-800 p-6 rounded-xl border border-purple-500/30 hover:bg-gray-700 transition-colors block">
                                        <span className="text-xs font-bold text-purple-400 uppercase">Danh mục</span>
                                        <h3 className="text-xl font-bold text-white">{a.name}</h3>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Products Grid */}
                        {results.products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                {results.products.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onQuickViewClick={setQuickViewProductId}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
                                <p className="text-gray-400">Không tìm thấy kết quả phù hợp trực tiếp.</p>
                                <p className="text-sm text-gray-500 mt-2">Hãy thử điều chỉnh từ khóa tìm kiếm của bạn.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
            <QuickViewModal
                productId={quickViewProductId}
                onClose={() => setQuickViewProductId(null)}
            />
        </main>
    );
}