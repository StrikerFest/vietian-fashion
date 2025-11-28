// app/cart/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CartItemList from '@/components/cart/CartItemList';
import CartSummary from '@/components/cart/CartSummary';
import ShippingAddressSelector from '@/components/cart/ShippingAddressSelector';
import GuestAddressForm from '@/components/cart/GuestAddressForm'; // --- NEW IMPORT ---
import AddressModal from '@/components/AddressModal';
import { useToast } from '@/context/ToastContext';

export default function CartPage() {
    const router = useRouter();
    const { session } = useAuth();
    const { addToast } = useToast();

    // Cart Context
    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        subtotal,
        clearCart,
        appliedDiscount,
        applyDiscountCode,
        removeDiscountCode,
        discountAmount,
        total
    } = useCart();

    // Local State
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

    // --- NEW GUEST ADDRESS STATE ---
    const [guestAddressData, setGuestAddressData] = useState(null);
    const [isGuestAddressValid, setIsGuestAddressValid] = useState(false);


    // --- Address Logic ---
    const fetchAddresses = useCallback(async () => {
        if (!session) return;
        setIsLoadingAddresses(true);
        try {
            const response = await fetch('/api/account/addresses');
            if (response.ok) {
                const data = await response.json();
                setAddresses(data || []);

                // Preserve selection if valid, otherwise default
                const hasValidSelection = data.some(a => a.id === selectedAddressId);
                if (!hasValidSelection) {
                    const defaultAddr = data.find(a => a.is_default);
                    if (defaultAddr) {
                        setSelectedAddressId(defaultAddr.id);
                    } else if (data.length > 0) {
                        setSelectedAddressId(data[0].id);
                    } else {
                        setSelectedAddressId(null);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch addresses", error);
        } finally {
            setIsLoadingAddresses(false);
        }
    }, [session, selectedAddressId]);

    useEffect(() => {
        if (session) {
            fetchAddresses();
        }
    }, [session, fetchAddresses]);

    // --- Checkout Logic ---
    const handleCheckout = async () => {
        let finalAddressId = null;
        let finalGuestAddress = null;
        let requiresAddress = true; // Assume physical goods

        if (session) {
            if (!selectedAddressId) {
                addToast('Please select a shipping address.', 'error');
                return;
            }
            finalAddressId = selectedAddressId;
        } else {
            // Guest Checkout
            if (!isGuestAddressValid || !guestAddressData) {
                addToast('Please fill in a complete shipping address.', 'error');
                return;
            }
            finalGuestAddress = guestAddressData;
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
                    addressId: finalAddressId,
                    // --- NEW: Pass raw address data for guest checkout ---
                    guestAddressData: finalGuestAddress
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
            addToast(`Checkout Error: ${error.message}`, 'error');
            setIsCheckingOut(false);
        }
    };

    // --- Render ---
    if (cartItems.length === 0) {
        return (
            <main className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="mb-6 text-6xl">🛒</div>
                    <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
                    <p className="text-gray-400 mb-8">{`Looks like you haven't found your perfect outfit yet.`}</p>
                    <Link
                        href="/products"
                        className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                        Start Shopping
                    </Link>
                </div>
            </main>
        );
    }

    // Check if the user is logged in AND has selected a valid address OR if they are a guest AND have a valid guest address
    const hasValidAddress = session
        ? !!selectedAddressId
        : isGuestAddressValid;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
                    Your Cart
                    <span className="text-lg font-normal text-gray-500">({cartItems.length} items)</span>
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">

                    {/* Left Column: Items & Addresses */}
                    <div className="lg:col-span-2 space-y-8">
                        <CartItemList
                            cartItems={cartItems}
                            updateQuantity={updateQuantity}
                            removeFromCart={removeFromCart}
                        />

                        <ShippingAddressSelector
                            session={session}
                            addresses={addresses}
                            isLoading={isLoadingAddresses}
                            selectedAddressId={selectedAddressId}
                            onSelect={setSelectedAddressId}
                            onAddNew={() => setIsAddressModalOpen(true)}
                        >
                            {/* --- NEW: Pass Guest Form as Child if no session --- */}
                            {!session && (
                                <GuestAddressForm
                                    onChange={setGuestAddressData}
                                    setIsValid={setIsGuestAddressValid}
                                />
                            )}
                        </ShippingAddressSelector>
                    </div>

                    {/* Right Column: Summary */}
                    <div className="lg:col-span-1">
                        <CartSummary
                            subtotal={subtotal}
                            discountAmount={discountAmount}
                            total={total}
                            appliedDiscount={appliedDiscount}
                            onApplyDiscount={applyDiscountCode}
                            onRemoveDiscount={removeDiscountCode}
                            onCheckout={handleCheckout}
                            isCheckingOut={isCheckingOut}
                            session={session}
                            // --- MODIFIED: Use the combined validation ---
                            hasSelectedAddress={hasValidAddress}
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