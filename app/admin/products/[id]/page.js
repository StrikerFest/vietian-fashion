'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { useToast } from '@/context/ToastContext';

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;
    const { addToast } = useToast();

    const [product, setProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                const [productRes, categoriesRes, collectionsRes] = await Promise.all([
                    fetch(`/api/products/${id}`, { cache: 'no-store' }),
                    fetch('/api/categories', { cache: 'no-store' }),
                    fetch('/api/collections', { cache: 'no-store' })
                ]);

                if (!productRes.ok) throw new Error('Product not found');
                
                const productData = await productRes.json();
                setProduct(productData);

                setCategories(await categoriesRes.json() || []);
                const colData = await collectionsRes.json();
                setCollections(colData.data || []);

            } catch (error) {
                console.error("Failed to fetch data:", error);
                addToast("Không thể tải thông tin sản phẩm.", 'error');
                router.push('/admin/products');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id, router, addToast]);

    const handleSuccess = (message) => {
        addToast(message, 'success');
        router.push('/admin/products');
    };

    const handleCancel = () => {
        router.back();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!product) return null;

    console.log("[EditPage] Rendering ProductForm with:", product);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Chỉnh sửa Sản phẩm</h1>
            <ProductForm
                initialData={product}
                categories={categories}
                collections={collections}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
            />
        </div>
    );
}