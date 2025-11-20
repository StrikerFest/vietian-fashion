// app/account/page.js
'use client';

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// --- NEW: Import the AddressModal ---
import AddressModal from '@/components/AddressModal';

// @unchanged (Helper component for status badges)
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

    // Order State
    const [orders, setOrders] = useState([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);

    // --- NEW: Address State ---
    const [addresses, setAddresses] = useState([]);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

    // --- NEW: Fetch Addresses Function ---
    const fetchAddresses = useCallback(async () => {
        setIsLoadingAddresses(true);
        try {
            const response = await fetch('/api/account/addresses');
            if (!response.ok) throw new Error('Failed to fetch addresses');
            const data = await response.json();
            setAddresses(data || []);
        } catch (error) {
            console.error("Error loading addresses:", error);
        } finally {
            setIsLoadingAddresses(false);
        }
    }, []);

    // Fetch Orders Function (moved inside component for consistency)
    const fetchOrders = useCallback(async () => {
        setIsLoadingOrders(true);
        try {
            const response = await fetch('/api/account/orders');
            if (response.status === 401) {
                router.push('/login');
                return;
            }
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();
            setOrders(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingOrders(false);
        }
    }, [router]);

    // --- NEW: Handle Delete Address ---
    const handleDeleteAddress = async (addressId) => {
        if (!confirm('Are you sure you want to delete this address?')) return;

        try {
            const response = await fetch(`/api/account/addresses/${addressId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete address');
            }

            // Refresh the list
            fetchAddresses();
        } catch (error) {
            alert(error.message);
        }
    };

    useEffect(() => {
        if (isAuthLoading) return;

        if (!session) {
            router.push('/login');
            return;
        }

        // Fetch both resources
        fetchOrders();
        fetchAddresses();
    }, [session, isAuthLoading, router, fetchOrders, fetchAddresses]);

    if (isAuthLoading || !session) {
        return (
            <main className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
                <p>Loading your account...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-extrabold mb-4">My Account</h1>
                <p className="text-lg text-gray-400 mb-8">
                    Welcome back, <span className="font-semibold text-indigo-400">{session.user.email}</span>
                </p>

                {/* --- MODIFIED: Grid Layout for Orders and Addresses --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Order History (Takes up 2 columns on large screens) */}
                    <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg h-fit">
                        <h2 className="text-2xl font-bold mb-6">My Order History</h2>

                        {isLoadingOrders ? (
                            <p className="text-gray-400">Loading orders...</p>
                        ) : orders.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                                <p>You have not placed any orders yet.</p>
                                <Link href="/products" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 font-semibold">
                                    Start Shopping
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* @unchanged (Order List Loop) */}
                                {orders.map(order => (
                                    <div key={order.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold">
                                                    Order <Link href={`/order-confirmation/${order.id}`} className="font-mono text-indigo-400 hover:underline">#{order.id}</Link>
                                                </h3>
                                                <p className="text-sm text-gray-400">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <OrderStatusBadge status={order.status} />
                                        </div>
                                        {/* Brief Item Summary */}
                                        <div className="space-y-1 mb-3 text-sm text-gray-300">
                                            {order.order_items.slice(0, 2).map((item, idx) => (
                                                <p key={idx}>{item.quantity} x {item.product_variants.products.name}</p>
                                            ))}
                                            {order.order_items.length > 2 && <p className="text-xs text-gray-500">+{order.order_items.length - 2} more items...</p>}
                                        </div>
                                        <div className="border-t border-gray-700 pt-3 text-right">
                                            <p className="font-bold text-lg">${order.total_amount.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Address Book (Takes up 1 column) */}
                    <div className="lg:col-span-1 bg-gray-800 p-6 rounded-lg h-fit">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">My Addresses</h2>
                            <button
                                onClick={() => setIsAddressModalOpen(true)}
                                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-md font-semibold transition-colors"
                            >
                                + Add New
                            </button>
                        </div>

                        {isLoadingAddresses ? (
                            <p className="text-gray-400">Loading addresses...</p>
                        ) : addresses.length === 0 ? (
                            <p className="text-gray-400 text-sm">No addresses saved.</p>
                        ) : (
                            <div className="space-y-4">
                                {addresses.map((addr) => (
                                    <div key={addr.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 relative group">
                                        {addr.is_default && (
                                            <span className="absolute top-2 right-2 bg-teal-900 text-teal-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                                Default
                                            </span>
                                        )}
                                        <div className="text-sm text-gray-300 pr-8">
                                            <p className="font-semibold text-white mb-1">{addr.address_line_1}</p>
                                            {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                                            <p>{addr.city}, {addr.state_province_region} {addr.postal_code}</p>
                                            <p>{addr.country}</p>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-gray-700 flex justify-end">
                                            <button
                                                onClick={() => handleDeleteAddress(addr.id)}
                                                className="text-red-400 hover:text-red-300 text-xs font-semibold"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- NEW: Address Modal Component --- */}
            <AddressModal
                isOpen={isAddressModalOpen}
                onClose={() => setIsAddressModalOpen(false)}
                onAddressAdded={fetchAddresses}
            />
        </main>
    );
}