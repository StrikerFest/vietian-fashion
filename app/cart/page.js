// app/cart/page.js
'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    // --- Get discount-related state and functions from context ---
    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        subtotal,
        clearCart,
        appliedDiscount, // The applied discount object
        discountCodeInput, // The value in the input field
        setDiscountCodeInput, // Function to update the input field
        applyDiscountCode, // Function to validate and apply the code
        removeDiscountCode, // Function to remove the applied code
        discountAmount, // Calculated discount amount
        total // Final total after discount
    } = useCart(); //

    const [isCheckingOut, setIsCheckingOut] = useState(false);
    // --- NEW: State for discount application UI ---
    const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
    const [discountMessage, setDiscountMessage] = useState({ type: '', text: '' }); // To show success/error

    const router = useRouter();

    const handleApplyDiscount = async (e) => {
        e.preventDefault();
        setIsApplyingDiscount(true);
        setDiscountMessage({ type: '', text: '' }); // Clear previous message
        const result = await applyDiscountCode(discountCodeInput); // Use the function from context
        setDiscountMessage({
            type: result.success ? 'success' : 'error',
            text: result.message
        });
        setIsApplyingDiscount(false);
    };

    const handleRemoveDiscount = () => {
        removeDiscountCode(); // Use the function from context
        setDiscountMessage({ type: '', text: '' }); // Clear any messages
    };

    const handleCheckout = async () => {
        setIsCheckingOut(true);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // --- Pass cart items AND the applied discount ID ---
                body: JSON.stringify({
                    cartItems,
                    discountId: appliedDiscount?.id || null // Pass the ID if a discount is applied
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Checkout failed');
            }

            const data = await response.json();

            if (data.success) {
                clearCart();
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

                        {/* Order Summary & Discount */}
                        <div className="bg-gray-800 p-6 rounded-lg self-start space-y-4">
                            <h2 className="text-xl font-bold">Order Summary</h2>
                            {/* --- Discount Code Section --- */}
                            {!appliedDiscount ? (
                                <form onSubmit={handleApplyDiscount}>
                                    <label htmlFor="discount-code" className="block text-sm font-medium mb-1">Discount Code</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            id="discount-code"
                                            value={discountCodeInput}
                                            onChange={(e) => setDiscountCodeInput(e.target.value)}
                                            placeholder="Enter code"
                                            className="flex-grow bg-gray-700 p-2 rounded-md border border-gray-600"
                                            disabled={isApplyingDiscount}
                                        />
                                        <button
                                            type="submit"
                                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                                            disabled={isApplyingDiscount || !discountCodeInput}
                                        >
                                            {isApplyingDiscount ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="text-sm">
                                    <p className="flex justify-between items-center">
                                        <span>Discount Applied: <span className="font-mono bg-gray-700 px-2 py-0.5 rounded">{appliedDiscount.code}</span></span>
                                        <button onClick={handleRemoveDiscount} className="text-red-500 hover:text-red-400 font-semibold text-xs">(Remove)</button>
                                    </p>
                                </div>
                            )}
                            {/* --- Display Discount Success/Error Messages --- */}
                            {discountMessage.text && (
                                <p className={`text-sm ${discountMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                    {discountMessage.text}
                                </p>
                            )}

                            {/* --- Totals --- */}
                            <div className="border-t border-gray-700 pt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Subtotal</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                {/* Show discount amount if applied */}
                                {appliedDiscount && (
                                    <div className="flex justify-between text-green-400">
                                        <span>Discount ({appliedDiscount.code})</span>
                                        <span>-${discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-400">
                                    <span>Shipping</span>
                                    <span>Free</span>
                                </div>
                                <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    {/* Display the final total from context */}
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={isCheckingOut}
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
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