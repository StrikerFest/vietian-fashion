// app/categories/[...slug]/page.js
'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';

export default function CategoryPage(props) {
    const { slug } = props.params;

    const [products, setProducts] = useState([]);
    const [categoryInfo, setCategoryInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (slug && slug.length > 0) {
            const fetchCategoryProducts = async () => {
                setIsLoading(true);
                try {
                    // Joins the slug array into a path, e.g., ['tops', 't-shirts'] -> 'tops/t-shirts'
                    const categoryPath = slug.join('/');
                    const response = await fetch(`/api/products/category/${categoryPath}`);

                    if (!response.ok) {
                        throw new Error('Category not found');
                    }

                    const data = await response.json();
                    setCategoryInfo(data.category);
                    setProducts(data.products || []);
                } catch (error) {
                    console.error("Failed to fetch category products:", error);
                    setCategoryInfo(null);
                    setProducts([]);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchCategoryProducts();
        }
    }, [slug]);

    if (isLoading) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><p>Loading category...</p></div>;
    }

    if (!categoryInfo) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center text-center p-8">
                <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
                <p className="text-gray-400 mb-6">Sorry, we couldn't find the category you were looking for.</p>
                <Link href="/products" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg">
                    Browse All Products
                </Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-extrabold text-center mb-4">{categoryInfo.name}</h1>
                <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">{categoryInfo.description}</p>

                {products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500">There are no products in this category yet.</p>
                )}
            </div>
        </main>
    );
}