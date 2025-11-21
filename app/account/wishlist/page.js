// app/account/wishlist/page.js
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import WishlistGrid from '@/components/account/WishlistGrid';

export default function WishlistPage() {
    const { session, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!session) {
            router.push('/login');
            return;
        }

        const fetchItems = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/account/wishlist');
                if (res.ok) {
                    const data = await res.json();
                    setItems(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchItems();
    }, [session, isAuthLoading, router]);

    if (isAuthLoading || !session) return null;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <h1 className="text-3xl font-extrabold">My Wishlist</h1>
                    <span className="bg-gray-700 px-3 py-1 rounded-full text-sm font-medium text-gray-300">
                        {items.length} items
                    </span>
                </div>

                <WishlistGrid items={items} isLoading={isLoading} />
            </div>
        </main>
    );
}