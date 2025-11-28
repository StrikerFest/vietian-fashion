// app/admin/users/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import UserAddresses from '@/components/admin/UserAddresses';
import UserOrders from '@/components/admin/UserOrders';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function UserDetailsPage() {
    const params = useParams();
    const { id } = params;
    const router = useRouter();
    const { addToast } = useToast(); // --- NEW ---

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchUser = async () => {
            try {
                const response = await fetch(`/api/admin/users/${id}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        addToast("User not found", 'error'); // --- FIXED: Replaced alert() ---
                        router.push('/admin/users');
                        return;
                    }
                    throw new Error('Failed to load user');
                }
                const data = await response.json();
                setUser(data);
            } catch (error) {
                console.error(error);
                addToast(error.message, 'error'); // --- FIXED ---
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, [id, router, addToast]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
                <p className="text-gray-400">Loading profile...</p>
            </div>
        );
    }

    if (!user) return null; // Handled by redirect in useEffect

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/users" className="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center transition-colors">
                    &larr; Back to Customers
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">{user.first_name} {user.last_name}</h1>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-indigo-400 font-mono">{user.email}</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">ID: {user.id}</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">Joined {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    {/* You could add User specific actions here like 'Reset Password' or 'Edit' in future */}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Addresses */}
                <div className="lg:col-span-1">
                    <UserAddresses addresses={user.addresses} />
                </div>

                {/* Right Column: Orders */}
                <div className="lg:col-span-2">
                    <UserOrders orders={user.orders} />
                </div>
            </div>
        </div>
    );
}