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
import GuestAddressForm from '@/components/cart/GuestAddressForm';
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

    // --- Guest Data State (Now includes Email + Phone + Address) ---
    const [guestData, setGuestData] = useState(null);
    const [isGuestValid, setIsGuestValid] = useState(false);

    // --- Payment Method State ---
    const [paymentMethod, setPaymentMethod] = useState('cod');

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
        let finalGuestData = null;

        if (session) {
            if (!selectedAddressId) {
                addToast('Vui lòng chọn địa chỉ giao hàng.', 'error');
                return;
            }
            finalAddressId = selectedAddressId;
        } else {
            // Guest Checkout
            if (!isGuestValid || !guestData) {
                addToast('Vui lòng điền đầy đủ thông tin giao hàng và liên hệ.', 'error');
                return;
            }
            finalGuestData = guestData;
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
                    guestData: finalGuestData, // Contains { email, phone, ...address }
                    paymentMethod
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Thanh toán thất bại');
            }

            const data = await response.json();

            if (data.success) {
                clearCart();
                router.push(`/order-confirmation/${data.orderId}`);
            }
        } catch (error) {
            console.error('Checkout error:', error);
            addToast(`Lỗi thanh toán: ${error.message}`, 'error');
            setIsCheckingOut(false);
        }
    };

    // --- Render ---
    if (cartItems.length === 0) {
        return (
            <main className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="mb-6 text-6xl">🛒</div>
                    <h1 className="text-3xl font-bold mb-4">Giỏ hàng của bạn đang trống</h1>
                    <p className="text-gray-400 mb-8">{`Có vẻ như bạn chưa tìm thấy trang phục hoàn hảo cho mình.`}</p>
                    <Link
                        href="/products"
                        className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                        Bắt đầu mua sắm
                    </Link>
                </div>
            </main>
        );
    }

    // Determine if we have valid info to enable checkout button
    const hasValidInfo = session ? !!selectedAddressId : isGuestValid;

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
                    Giỏ hàng của bạn
                    <span className="text-lg font-normal text-gray-500">({cartItems.length} món)</span>
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
                            {!session && (
                                <GuestAddressForm
                                    onChange={setGuestData}
                                    setIsValid={setIsGuestValid}
                                />
                            )}
                        </ShippingAddressSelector>
                    </div>

                    {/* Right Column: Summary & Payment */}
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
                            hasSelectedAddress={hasValidInfo}
                            paymentMethod={paymentMethod}
                            setPaymentMethod={setPaymentMethod}
                        />
                    </div>
                </div>
            </div>

            <AddressModal
                isOpen={isAddressModalOpen}
                onClose={() => setIsAddressModalOpen(false)}
                onAddressAdded={fetchAddresses}
            />
        </main>
    );
}