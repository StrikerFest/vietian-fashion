// app/cart/page.js
'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddressModal from '@/components/AddressModal';

export default function CartPage() {
    // @unchanged (useCart hook)
    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        subtotal,
        clearCart,
        appliedDiscount,
        discountCodeInput,
        setDiscountCodeInput,
        applyDiscountCode,
        removeDiscountCode,
        discountAmount,
        total
    } = useCart();

    // @unchanged (useAuth hook)
    const { session } = useAuth();

    // @unchanged (state hooks)
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
    const [discountMessage, setDiscountMessage] = useState({ type: '', text: '' });
    const router = useRouter();

    // --- NEW: Address State ---
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

    // --- NEW: Fetch Addresses ---
    const fetchAddresses = async () => {
        if (!session) return;
        setIsLoadingAddresses(true);
        try {
            const response = await fetch('/api/account/addresses');
            if (response.ok) {
                const data = await response.json();
                setAddresses(data || []);
                // Auto-select default or first address
                const defaultAddr = data.find(a => a.is_default);
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                } else if (data.length > 0) {
                    setSelectedAddressId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch addresses", error);
        } finally {
            setIsLoadingAddresses(false);
        }
    };

    // Fetch addresses when session is available
    useEffect(() => {
        if (session) {
            fetchAddresses();
        }
    }, [session]);

    // @unchanged (handleApplyDiscount)
    const handleApplyDiscount = async (e) => {
        e.preventDefault();
        setIsApplyingDiscount(true);
        setDiscountMessage({ type: '', text: '' });
        const result = await applyDiscountCode(discountCodeInput);
        setDiscountMessage({
            type: result.success ? 'success' : 'error',
            text: result.message
        });
        setIsApplyingDiscount(false);
    };

    // @unchanged (handleRemoveDiscount)
    const handleRemoveDiscount = () => {
        removeDiscountCode();
        setDiscountMessage({ type: '', text: '' });
    };

    // @unchanged (handleCheckout)
    const handleCheckout = async () => {
        // --- NEW: Validation for Address ---
        if (session && !selectedAddressId) {
            alert('Please select a shipping address.');
            return;
        }

        setIsCheckingOut(true);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartItems,
                    discountId: appliedDiscount?.id || null,
                    userId: session?.user?.id || null,
                    addressId: selectedAddressId // --- NEW: Pass the address ID
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
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-extrabold mb-8">Your Cart</h1>

                {cartItems.length === 0 ? (
                    // @unchanged (Empty Cart)
                    <div className="text-center bg-gray-800 p-8 rounded-lg">
                        <p className="text-lg text-gray-400 mb-4">Your cart is currently empty.</p>
                        <Link href="/products" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg">
                            Continue Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* --- Left Column: Items & Address --- */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Cart Items List */}
                            <div className="space-y-4">
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex items-center bg-gray-800 p-4 rounded-lg">
                                        <Link href={`/products/${item.productId}`}>
                                            <img src={item.imageUrl} alt={item.productName} className="w-20 h-20 rounded-md object-cover mr-4 cursor-pointer"/>
                                        </Link>
                                        <div className="flex-grow">
                                            <Link href={`/products/${item.productId}`}>
                                                <h2 className="font-bold hover:text-indigo-400 cursor-pointer">{item.productName}</h2>
                                            </Link>
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

                            {/* --- NEW: Shipping Address Section --- */}
                            {session ? (
                                <div className="bg-gray-800 p-6 rounded-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold">Shipping Address</h2>
                                        <button
                                            onClick={() => setIsAddressModalOpen(true)}
                                            className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold"
                                        >
                                            + New Address
                                        </button>
                                    </div>

                                    {isLoadingAddresses ? (
                                        <p className="text-gray-400">Loading addresses...</p>
                                    ) : addresses.length === 0 ? (
                                        <div className="text-center p-4 border border-dashed border-gray-600 rounded-lg">
                                            <p className="text-gray-400 mb-2">No addresses saved.</p>
                                            <button
                                                onClick={() => setIsAddressModalOpen(true)}
                                                className="text-indigo-400 hover:underline"
                                            >
                                                Add your first address
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {addresses.map(addr => (
                                                <div
                                                    key={addr.id}
                                                    onClick={() => setSelectedAddressId(addr.id)}
                                                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                                        selectedAddressId === addr.id
                                                            ? 'border-indigo-500 bg-indigo-900/20 ring-1 ring-indigo-500'
                                                            : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-semibold">{addr.address_line_1}</p>
                                                        {selectedAddressId === addr.id && (
                                                            <span className="text-indigo-400 text-lg">✓</span>
                                                        )}
                                                    </div>
                                                    {addr.address_line_2 && <p className="text-sm text-gray-400">{addr.address_line_2}</p>}
                                                    <p className="text-sm text-gray-400">{addr.city}, {addr.state_province_region} {addr.postal_code}</p>
                                                    <p className="text-sm text-gray-400">{addr.country}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-800 p-6 rounded-lg border border-yellow-700/50">
                                    <h2 className="text-xl font-bold mb-2 text-yellow-500">Guest Checkout</h2>
                                    <p className="text-gray-300 mb-4">You are checking out as a guest. Please sign in to save your address for future orders.</p>
                                    <Link href="/login" className="inline-block bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors">
                                        Sign In / Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Order Summary */}
                        <div className="bg-gray-800 p-6 rounded-lg self-start space-y-4 sticky top-24">
                            <h2 className="text-xl font-bold">Order Summary</h2>
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
                            {discountMessage.text && (
                                <p className={`text-sm ${discountMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                    {discountMessage.text}
                                </p>
                            )}

                            <div className="border-t border-gray-700 pt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Subtotal</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
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
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={isCheckingOut || (session && !selectedAddressId)}
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCheckingOut ? 'Processing...' : 'Complete Purchase'}
                            </button>
                            {session && !selectedAddressId && (
                                <p className="text-xs text-red-400 text-center mt-2">Please select a shipping address to continue.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- NEW: Address Modal --- */}
            <AddressModal
                isOpen={isAddressModalOpen}
                onClose={() => setIsAddressModalOpen(false)}
                onAddressAdded={fetchAddresses}
            />
        </main>
    );
}