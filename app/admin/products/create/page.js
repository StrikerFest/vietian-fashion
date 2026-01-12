'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { useToast } from '@/context/ToastContext';

export default function CreateProductPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const [categories, setCategories] = useState([]);
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [categoriesRes, collectionsRes] = await Promise.all([
                    fetch('/api/categories'),
                    fetch('/api/collections')
                ]);

                if (!categoriesRes.ok || !collectionsRes.ok) {
                    throw new Error('Failed to fetch metadata');
                }

                setCategories(await categoriesRes.json() || []);
                const colData = await collectionsRes.json();
                setCollections(colData.data || []);
            } catch (error) {
                console.error("Failed to load metadata:", error);
                addToast("Không thể tải danh mục.", 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetadata();
    }, [addToast]);

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

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Tạo Sản Phẩm Mới</h1>
            <ProductForm
                categories={categories}
                collections={collections}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
            />
        </div>
    );
}