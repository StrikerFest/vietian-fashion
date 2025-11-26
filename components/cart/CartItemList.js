// components/cart/CartItemList.js
'use client';

import Link from 'next/link';

export default function CartItemList({ cartItems, updateQuantity, removeFromCart }) {
    return (
        <div className="space-y-4">
            {cartItems.map(item => (
                <div key={item.id} className="flex items-center bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-sm">
                    {/* Product Image */}
                    <Link href={`/products/${item.productId}`} className="shrink-0">
                        <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-20 h-20 rounded-md object-cover mr-4 cursor-pointer border border-gray-600"
                        />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-grow min-w-0 mr-4">
                        <Link href={`/products/${item.productId}`}>
                            <h2 className="font-bold text-white hover:text-indigo-400 cursor-pointer truncate transition-colors">
                                {item.productName}
                            </h2>
                        </Link>

                        {/* Dynamic Attributes Badge List */}
                        <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-2">
                            {item.attributes && Object.entries(item.attributes).map(([key, val]) => (
                                <span key={key} className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-600">
                                    <span className="text-gray-500 mr-1">{key}:</span>{val}
                                </span>
                            ))}
                            {/* Fallback for legacy items without attributes object */}
                            {(!item.attributes && (item.size || item.color)) && (
                                <>
                                    {item.size && <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{item.size}</span>}
                                    {item.color && <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{item.color}</span>}
                                </>
                            )}
                        </div>

                        <p className="text-indigo-400 font-semibold mt-1">${item.price.toFixed(2)}</p>
                    </div>

                    {/* Quantity & Remove (Unchanged) */}
                    <div className="flex items-center gap-3 bg-gray-900/50 p-1 rounded-lg border border-gray-700">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white">-</button>
                        <span className="w-6 text-center font-mono text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white">+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="ml-6 text-gray-500 hover:text-red-500 p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            ))}
        </div>
    );
}