// app/admin/users/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function UserDetailsPage() {
    const params = useParams();
    const { id } = params;
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch(`/api/admin/users/${id}`);
                if (!response.ok) throw new Error('User not found');
                const data = await response.json();
                setUser(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchUser();
    }, [id]);

    if (isLoading) return <div className="p-8 text-white">Loading profile...</div>;
    if (!user) return <div className="p-8 text-white">User not found.</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="mb-6">
                <Link href="/admin/users" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">&larr; Back to Customers</Link>
                <h1 className="text-3xl font-bold">{user.first_name} {user.last_name}</h1>
                <p className="text-indigo-400">{user.email}</p>
                <p className="text-xs text-gray-500 mt-1">User ID: {user.id} • Joined {new Date(user.created_at).toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Addresses Column */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4">Addresses</h2>
                        {user.addresses && user.addresses.length > 0 ? (
                            <div className="space-y-4">
                                {user.addresses.map(addr => (
                                    <div key={addr.id} className="bg-gray-900/50 p-3 rounded border border-gray-700 text-sm">
                                        {addr.is_default && <span className="text-xs bg-green-900 text-green-200 px-1.5 rounded ml-auto block w-fit mb-1">Default</span>}
                                        <p>{addr.address_line_1}</p>
                                        {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                                        <p>{addr.city}, {addr.state_province_region} {addr.postal_code}</p>
                                        <p>{addr.country}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No addresses saved.</p>
                        )}
                    </div>
                </div>

                {/* Orders Column */}
                <div className="md:col-span-2">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4">Order History</h2>
                        {user.orders && user.orders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900">
                                    <tr>
                                        <th className="p-3">Order #</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Total</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Link</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {user.orders.map(order => (
                                        <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 font-mono">#{order.id}</td>
                                            <td className="p-3">{new Date(order.created_at).toLocaleDateString()}</td>
                                            <td className="p-3">${order.total_amount.toFixed(2)}</td>
                                            <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                                                        order.status === 'paid' ? 'bg-green-800 text-green-200' :
                                                            order.status === 'cancelled' ? 'bg-red-800 text-red-200' :
                                                                'bg-gray-700 text-gray-300'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                            </td>
                                            <td className="p-3">
                                                {/* Note: Ideally you would link to an Admin Order Detail page if it exists,
                                                        or use the public order confirmation if admin auth allows viewing it */}
                                                <span className="text-gray-500">View in Orders</span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No orders placed yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}