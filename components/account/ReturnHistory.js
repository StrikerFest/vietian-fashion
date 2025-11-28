// components/account/ReturnHistory.js
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function ReturnHistory({ returns }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-900/50 text-green-200 border-green-700';
            case 'rejected': return 'bg-red-900/50 text-red-200 border-red-700';
            default: return 'bg-yellow-900/50 text-yellow-200 border-yellow-700';
        }
    };

    const renderVariantDetails = (variant) => {
        if (!variant) return null;

        // 1. Dynamic Attributes
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            return Object.values(variant.attributes).join(' / ');
        }
        // 2. SKU Fallback
        return variant.sku;
    };

    if (returns.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700 border-dashed">
                <p className="text-gray-400 mb-4">You have no return requests.</p>
                <Link href="/account" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                    Back to Account
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {returns.map((req) => (
                <div key={req.id} className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                    <div className="flex flex-wrap justify-between items-start mb-4 gap-4 border-b border-gray-700 pb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-bold text-white text-lg">Return #{req.id}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase ${getStatusColor(req.status)}`}>
                                    {req.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-400">
                                Requested on {new Date(req.created_at).toLocaleDateString()} •
                                For Order <Link href={`/order-confirmation/${req.order_id}`} className="text-indigo-400 hover:underline">#{req.order_id}</Link>
                            </p>
                        </div>
                    </div>

                    <div className="mb-4 bg-gray-900/30 p-3 rounded text-sm">
                        <span className="text-gray-500 font-semibold mr-2">Reason:</span>
                        <span className="text-gray-300 italic">{`"${req.reason}"`}</span>
                    </div>

                    <div className="space-y-2">
                        {req.return_items.map((item) => {
                            const product = item.order_items?.product_variants?.products;
                            const variant = item.order_items?.product_variants;

                            return (
                                <div key={item.id} className="flex items-center gap-4 bg-gray-900/50 p-3 rounded border border-gray-700/50">
                                    <div className="w-12 h-12 bg-gray-800 rounded flex-shrink-0 overflow-hidden border border-gray-700 relative">
                                        {product?.image_url ? (
                                            <Image
                                                src={product.image_url}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                                sizes="48px"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">IMG</div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-200 text-sm">{product?.name || 'Unknown Item'}</p>
                                        <p className="text-xs text-gray-500">
                                            {renderVariantDetails(variant)} • Qty: {item.quantity}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}