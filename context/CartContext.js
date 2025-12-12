// context/CartContext.js
'use client';

import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

const CartContext = createContext();
const CART_STORAGE_KEY = 'vietian_fashion_cart';
const DISCOUNT_STORAGE_KEY = 'vietian_fashion_discount';

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountCodeInput, setDiscountCodeInput] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);
    const { addToast } = useToast();

    // --- Load from LocalStorage ---
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem(CART_STORAGE_KEY);
            if (savedCart) setCartItems(JSON.parse(savedCart));

            const savedDiscount = localStorage.getItem(DISCOUNT_STORAGE_KEY);
            if (savedDiscount) setAppliedDiscount(JSON.parse(savedDiscount));
        } catch (error) {
            console.error("Failed to load cart", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // --- Save to LocalStorage ---
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        if (appliedDiscount) localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(appliedDiscount));
        else localStorage.removeItem(DISCOUNT_STORAGE_KEY);
    }, [cartItems, appliedDiscount, isLoaded]);

    // --- Actions ---

    // Helper to generate unique ID based on variant AND custom options
    const generateCartItemId = (variantId, options) => {
        if (!options || Object.keys(options).length === 0) return variantId;
        // Simple hash of options string
        const optionString = JSON.stringify(options);
        return `${variantId}-${btoa(optionString).substring(0, 10)}`;
    };

    const addToCart = (product, variant, customOptions = {}) => {
        // 1. Calculate total price modifier from options
        let optionsTotal = 0;
        if (customOptions) {
            Object.values(customOptions).forEach(opt => {
                optionsTotal += (opt.priceModifier || 0);
            });
        }

        const finalPrice = variant.price + optionsTotal;
        const uniqueId = generateCartItemId(variant.id, customOptions);

        setCartItems(prevItems => {
            // Check if THIS specific configuration exists
            const existingItem = prevItems.find(item => item.uniqueId === uniqueId);

            if (existingItem) {
                return prevItems.map(item =>
                    item.uniqueId === uniqueId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, {
                ...variant,
                id: variant.id, // DB Variant ID (for stock check)
                uniqueId: uniqueId, // Cart specific ID (for keying)
                productId: product.id,
                productName: product.name,
                imageUrl: product.image_url || 'https://placehold.co/100x100/1F2937/FFFFFF?text=Item',
                quantity: 1,
                selectedOptions: customOptions, // Store user choices
                price: finalPrice // Store final calculated price
            }];
        });

        addToast(`Đã thêm ${product.name} vào giỏ hàng`, 'success');
    };

    const removeFromCart = (uniqueId) => {
        setCartItems(prevItems => prevItems.filter(item => item.uniqueId !== uniqueId));
    };

    const updateQuantity = (uniqueId, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(uniqueId);
        } else {
            setCartItems(prevItems =>
                prevItems.map(item =>
                    item.uniqueId === uniqueId ? { ...item, quantity: newQuantity } : item
                )
            );
        }
    };

    const clearCart = () => {
        setCartItems([]);
        setAppliedDiscount(null);
        setDiscountCodeInput('');
    };

    const applyDiscountCode = async (code) => {
        if (!code) return { success: false, message: 'Vui lòng nhập mã.' };
        try {
            const response = await fetch('/api/validate-discount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.trim().toUpperCase() }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Xác thực mã thất bại.');
            setAppliedDiscount(data.discount);
            setDiscountCodeInput(data.discount.code);
            addToast(`Đã áp dụng mã ${data.discount.code}!`, 'success');
            return { success: true, message: 'Áp dụng mã thành công!' };
        } catch (error) {
            setAppliedDiscount(null);
            return { success: false, message: error.message || 'Mã giảm giá không hợp lệ.' };
        }
    };

    const removeDiscountCode = () => {
        setAppliedDiscount(null);
        setDiscountCodeInput('');
        addToast('Đã xóa mã giảm giá', 'info');
    };

    // ... [Totals calculation logic remains unchanged] ...
    const subtotal = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [cartItems]);

    const discountAmount = useMemo(() => {
        if (!appliedDiscount || subtotal === 0) return 0;
        if (appliedDiscount.type === 'percentage') {
            const discountValue = Math.min(Math.max(appliedDiscount.value, 0), 100);
            return (subtotal * discountValue) / 100;
        } else if (appliedDiscount.type === 'fixed') {
            return Math.min(appliedDiscount.value, subtotal);
        }
        return 0;
    }, [appliedDiscount, subtotal]);

    const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

    return (
        <CartContext.Provider value={{
            cartItems, addToCart, removeFromCart, updateQuantity, clearCart,
            subtotal, appliedDiscount, discountCodeInput, setDiscountCodeInput,
            applyDiscountCode, removeDiscountCode, discountAmount, total
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}