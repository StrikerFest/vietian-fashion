// components/account/OrderHistory.js
'use client';

import Link from 'next/link';
import OrderStatusBadge from '@/components/OrderStatusBadge';

export default function OrderHistory({ orders, isLoading }) {

    // Helper to format variant string safely
    const formatVariantDetails = (variant) => {
        if (!variant) return '';

        // Dynamic Attributes
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            return Object.entries(variant.attributes)
                .map(([key, val]) => `${key}: ${val}`)
                .join(' • ');
        }

        // Legacy Fallback
        if (variant.size || variant.color) {
            return `${variant.color || ''} ${variant.size || ''}`.trim();
        }

        return variant.sku || '';
    };

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
                    <Link href="/products" className="inline-block bg-gray-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-md transition-colors text-sm font-semibold">Start Shopping</Link>
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
                            <div className="space-y-3 mb-4 bg-gray-800/50 p-3 rounded text-sm border border-gray-700/50">
                                {order.order_items.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex flex-col border-b border-gray-700/50 last:border-0 pb-2 last:pb-0 mb-2 last:mb-0">
                                        <div className="flex justify-between text-gray-300">
                                            <span className="font-medium">
                                                {item.product_variants?.products?.name || 'Unknown Product'}
                                            </span>
                                            <span className="text-gray-500">x{item.quantity}</span>
                                        </div>

                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {formatVariantDetails(item.product_variants)}
                                        </div>

                                        {/* Display Custom Options (Engraving etc) */}
                                        {item.custom_options && Object.keys(item.custom_options).length > 0 && (
                                            <div className="mt-1 pl-2 border-l-2 border-indigo-500/30 text-xs">
                                                {Object.entries(item.custom_options).map(([key, opt]) => (
                                                    <div key={key} className="text-gray-400">
                                                        <span className="text-indigo-300">{opt.label}:</span> {opt.value}
                                                        {opt.priceModifier > 0 && (
                                                            <span className="text-gray-500 ml-1">(+${Number(opt.priceModifier).toFixed(2)})</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {order.order_items.length > 3 && (
                                    <p className="text-xs text-indigo-400 font-medium pt-1 text-center">+{order.order_items.length - 3} more items...</p>
                                )}
                            </div>

                            <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                                <Link href={`/order-confirmation/${order.id}`} className="text-sm text-gray-400 hover:text-white transition-colors">View Full Invoice</Link>
                                <p className="font-bold text-lg text-white">${order.total_amount.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}