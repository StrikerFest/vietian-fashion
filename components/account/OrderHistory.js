// components/account/OrderHistory.js
'use client';

import Link from 'next/link';
import OrderStatusBadge from '@/components/OrderStatusBadge'; // Reusing the shared component

export default function OrderHistory({ orders, isLoading }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg h-fit border border-gray-700 shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-white">My Order History</h2>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="mb-4">You have not placed any orders yet.</p>
                    <Link
                        href="/products"
                        className="inline-block bg-gray-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-md transition-colors text-sm font-semibold"
                    >
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-gray-900/50 p-5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                            <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        Order <Link href={`/order-confirmation/${order.id}`} className="font-mono text-indigo-400 hover:underline">#{order.id}</Link>
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Placed on {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                <OrderStatusBadge status={order.status} />
                            </div>

                            {/* Brief Item Summary */}
                            <div className="space-y-2 mb-4 bg-gray-800/50 p-3 rounded text-sm border border-gray-700/50">
                                {order.order_items.slice(0, 2).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-gray-300">
                                        <span>{item.product_variants?.products?.name || 'Unknown Product'}</span>
                                        <span className="text-gray-500">x{item.quantity}</span>
                                    </div>
                                ))}
                                {order.order_items.length > 2 && (
                                    <p className="text-xs text-indigo-400 font-medium pt-1">
                                        +{order.order_items.length - 2} more items...
                                    </p>
                                )}
                            </div>

                            <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                                <Link
                                    href={`/order-confirmation/${order.id}`}
                                    className="text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    View Invoice
                                </Link>
                                <p className="font-bold text-lg text-white">${order.total_amount.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}