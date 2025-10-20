// app/cart/page.js
'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import the router

export default function CartPage() {
    const { cartItems, removeFromCart, updateQuantity, subtotal, clearCart } = useCart();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const router = useRouter();

    const handleCheckout = async () => {
        setIsCheckingOut(true);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // In a real app with user auth, you'd pass userId and addressId here
                body: JSON.stringify({ cartItems }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Checkout failed');
            }

            const data = await response.json();

            if (data.success) {
                clearCart();
                // Redirect to a confirmation page
                router.push(`/order-confirmation/${data.orderId}`);
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert(`Error: ${error.message}`);
            setIsCheckingOut(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-extrabold mb-8">Your Cart</h1>

                {cartItems.length === 0 ? (
                    <div className="text-center bg-gray-800 p-8 rounded-lg">
                        <p className="text-lg text-gray-400 mb-4">Your cart is currently empty.</p>
                        <Link href="/products" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg">
                            Continue Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Cart Items List */}
                        <div className="md:col-span-2 space-y-4">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex items-center bg-gray-800 p-4 rounded-lg">
                                    <img src={item.imageUrl} alt={item.productName} className="w-20 h-20 rounded-md object-cover mr-4"/>
                                    <div className="flex-grow">
                                        <h2 className="font-bold">{item.productName}</h2>
                                        <p className="text-sm text-gray-400">{item.color} / {item.size}</p>
                                        <p className="text-indigo-400 font-semibold">${item.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 bg-gray-700 rounded">-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 bg-gray-700 rounded">+</button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="ml-6 text-red-500 hover:text-red-400 font-semibold">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary with updated button */}
                        <div className="bg-gray-800 p-6 rounded-lg self-start">
                            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-400">Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 mb-4">
                                <span>Shipping</span>
                                <span>Free</span>
                            </div>
                            <div className="border-t border-gray-700 pt-4 flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={isCheckingOut}
                                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}