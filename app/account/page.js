// app/account/page.js
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Helper component for status badges (copied from admin/orders page)
function OrderStatusBadge({ status }) {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status?.toLowerCase()) {
        case 'paid': return <span className={`${baseClasses} bg-green-800 text-green-200`}>Paid</span>;
        case 'shipped': return <span className={`${baseClasses} bg-blue-800 text-blue-200`}>Shipped</span>;
        case 'delivered': return <span className={`${baseClasses} bg-purple-800 text-purple-200`}>Delivered</span>;
        case 'cancelled': return <span className={`${baseClasses} bg-red-800 text-red-200`}>Cancelled</span>;
        default: return <span className={`${baseClasses} bg-gray-700 text-gray-300`}>Pending</span>;
    }
};

export default function AccountPage() {
    const { session, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);

    useEffect(() => {
        // 1. Wait for auth to finish loading
        if (isAuthLoading) {
            return; // Do nothing until auth status is confirmed
        }

        // 2. If auth is loaded and there's no session, redirect to login
        if (!session) {
            router.push('/login');
            return;
        }

        // 3. If auth is loaded and session exists, fetch orders
        const fetchOrders = async () => {
            setIsLoadingOrders(true);
            try {
                // Use the new API route
                const response = await fetch('/api/account/orders');

                if (response.status === 401) {
                    // This case should be rare if session check passed, but good for safety
                    router.push('/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch orders');
                }

                const data = await response.json();
                setOrders(data || []);
            } catch (error) {
                console.error(error);
                // Optionally show an error message to the user
            } finally {
                setIsLoadingOrders(false);
            }
        };

        fetchOrders();
    }, [session, isAuthLoading, router]);

    // Show loading spinner while checking auth or fetching orders
    if (isAuthLoading || isLoadingOrders || !session) {
        return (
            <main className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
                <p>Loading your account...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-extrabold mb-4">My Account</h1>
                <p className="text-lg text-gray-400 mb-8">
                    Welcome back, <span className="font-semibold text-indigo-400">{session.user.email}</span>
                </p>

                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold mb-6">My Order History</h2>

                    {orders.length === 0 ? (
                        <div className="text-center text-gray-400">
                            <p>You have not placed any orders yet.</p>
                            <Link href="/products" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 font-semibold">
                                Start Shopping
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {orders.map(order => (
                                <div key={order.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                Order ID:
                                                <Link href={`/order-confirmation/${order.id}`} className="font-mono text-indigo-400 hover:underline ml-2">
                                                    #{order.id}
                                                </Link>
                                            </h3>
                                            <p className="text-sm text-gray-400">
                                                Placed on: {new Date(order.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <OrderStatusBadge status={order.status} />
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {order.order_items.map(item => (
                                            <div key={item.product_variants.id} className="flex justify-between items-center text-sm ml-4">
                                                <div>
                                                    <p>{item.product_variants.products.name}</p>
                                                    <p className="text-gray-400 text-xs">
                                                        {item.product_variants.color} / {item.product_variants.size}
                                                    </p>
                                                </div>
                                                <p className="text-gray-400">
                                                    {item.quantity} x ${item.price_at_purchase.toFixed(2)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-gray-700 pt-3 text-right">
                                        <p className="font-bold text-lg">
                                            Total: ${order.total_amount.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}