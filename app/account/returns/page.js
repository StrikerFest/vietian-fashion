// app/account/returns/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReturnHistory from '@/components/account/ReturnHistory';

export default function CustomerReturnsPage() {
    const [returns, setReturns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchReturns = async () => {
            try {
                const res = await fetch('/api/account/returns');
                if (res.status === 401) {
                    router.push('/login');
                    return;
                }
                if (!res.ok) throw new Error('Failed to load returns');
                const data = await res.json();
                setReturns(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReturns();
    }, [router]);

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link href="/account" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
                        &larr; Quay lại Bảng điều khiển
                    </Link>
                    <h1 className="text-3xl font-extrabold">Đơn trả hàng của tôi</h1>
                    <p className="text-gray-400 mt-1">Theo dõi trạng thái các yêu cầu trả hàng của bạn.</p>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-gray-500">Đang tải...</div>
                ) : (
                    <ReturnHistory returns={returns} />
                )}
            </div>
        </main>
    );
}