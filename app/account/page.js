// app/account/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AddressModal from '@/components/AddressModal';
import OrderHistory from '@/components/account/OrderHistory';
import AddressBook from '@/components/account/AddressBook';

export default function AccountPage() {
    const { session, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    // State
    const [orders, setOrders] = useState([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [addresses, setAddresses] = useState([]);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

    // Fetch Data
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

    // Actions
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
            fetchAddresses();
        } catch (error) {
            alert(error.message);
        }
    };

    // Auth Guard & Initial Fetch
    useEffect(() => {
        if (isAuthLoading) return;
        if (!session) {
            router.push('/login');
            return;
        }
        fetchOrders();
        fetchAddresses();
    }, [session, isAuthLoading, router, fetchOrders, fetchAddresses]);

    if (isAuthLoading || !session) {
        return (
            <main className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                    <p className="text-gray-400">Loading your account...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Welcome Header */}
                <div className="mb-8 pb-6 border-b border-gray-800">
                    <h1 className="text-4xl font-extrabold mb-2">My Account</h1>
                    <p className="text-lg text-gray-400">
                        Welcome back, <span className="text-white font-medium">{session.user.email}</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Left Column: Orders */}
                    <div className="lg:col-span-2">
                        <OrderHistory orders={orders} isLoading={isLoadingOrders} />
                    </div>

                    {/* Right Column: Addresses */}
                    <div className="lg:col-span-1">
                        <AddressBook
                            addresses={addresses}
                            isLoading={isLoadingAddresses}
                            onAdd={() => setIsAddressModalOpen(true)}
                            onDelete={handleDeleteAddress}
                        />
                    </div>
                </div>
            </div>

            {/* Address Modal */}
            <AddressModal
                isOpen={isAddressModalOpen}
                onClose={() => setIsAddressModalOpen(false)}
                onAddressAdded={fetchAddresses}
            />
        </main>
    );
}