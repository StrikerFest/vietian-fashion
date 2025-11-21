// context/CartContext.js
'use client';

import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

const CartContext = createContext();

const CART_STORAGE_KEY = 'vietian_fashion_cart';
const DISCOUNT_STORAGE_KEY = 'vietian_fashion_discount';

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountCodeInput, setDiscountCodeInput] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);

    // --- NEW: Get the toast function ---
    const { addToast } = useToast();

    // Load from LocalStorage
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem(CART_STORAGE_KEY);
            if (savedCart) {
                setCartItems(JSON.parse(savedCart));
            }

            const savedDiscount = localStorage.getItem(DISCOUNT_STORAGE_KEY);
            if (savedDiscount) {
                setAppliedDiscount(JSON.parse(savedDiscount));
            }
        } catch (error) {
            console.error("Failed to load cart from localStorage", error);o
            localStorage.removeItem(CART_STORAGE_KEY);
            localStorage.removeItem(DISCOUNT_STORAGE_KEY);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save Cart to LocalStorage
    useEffect(() => {
        if (!isLoaded) return;
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        } catch (error) {
            console.error("Failed to save cart to localStorage", error);
        }
    }, [cartItems, isLoaded]);

    // Save Discount to LocalStorage
    useEffect(() => {
        if (!isLoaded) return;
        try {
            if (appliedDiscount) {
                localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(appliedDiscount));
            } else {
                localStorage.removeItem(DISCOUNT_STORAGE_KEY);
            }
        } catch (error) {
            console.error("Failed to save discount to localStorage", error);
        }
    }, [appliedDiscount, isLoaded]);


    // --- Actions ---

    const addToCart = (product, variant) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === variant.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, {
                ...variant,
                productId: product.id,
                productName: product.name,
                imageUrl: product.image_url || 'https://placehold.co/100x100/1F2937/FFFFFF?text=Item',
                quantity: 1
            }];
        });

        // --- MODIFIED: Use Toast instead of Alert ---
        addToast(`${product.name} added to cart`, 'success');
    };

    const removeFromCart = (variantId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== variantId));
        // Optional: addToast('Item removed', 'info');
    };

    const updateQuantity = (variantId, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(variantId);
        } else {
            setCartItems(prevItems =>
                prevItems.map(item =>
                    item.id === variantId ? { ...item, quantity: newQuantity } : item
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
        if (!code) return { success: false, message: 'Please enter a code.' };

        try {
            const response = await fetch('/api/validate-discount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.trim().toUpperCase() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to validate code.');
            }

            setAppliedDiscount(data.discount);
            setDiscountCodeInput(data.discount.code);

            // --- MODIFIED: Toast + Return ---
            addToast(`Discount ${data.discount.code} applied!`, 'success');
            return { success: true, message: 'Discount applied!' };

        } catch (error) {
            setAppliedDiscount(null);
            // We don't toast error here because the UI usually displays it below the input
            return { success: false, message: error.message || 'Invalid discount code.' };
        }
    };

    const removeDiscountCode = () => {
        setAppliedDiscount(null);
        setDiscountCodeInput('');

        // --- MODIFIED: Use Toast ---
        addToast('Discount removed', 'info');
    };

    // --- Calculations ---

    const subtotal = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [cartItems]);

    const discountAmount = useMemo(() => {
        if (!appliedDiscount || subtotal === 0) {
            return 0;
        }
        if (appliedDiscount.type === 'percentage') {
            const discountValue = Math.min(Math.max(appliedDiscount.value, 0), 100);
            return (subtotal * discountValue) / 100;
        } else if (appliedDiscount.type === 'fixed') {
            return Math.min(appliedDiscount.value, subtotal);
        }
        return 0;
    }, [appliedDiscount, subtotal]);

    const total = useMemo(() => {
        const calculatedTotal = subtotal - discountAmount;
        return Math.max(0, calculatedTotal);
    }, [subtotal, discountAmount]);

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        appliedDiscount,
        discountCodeInput,
        setDiscountCodeInput,
        applyDiscountCode,
        removeDiscountCode,
        discountAmount,
        total,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}