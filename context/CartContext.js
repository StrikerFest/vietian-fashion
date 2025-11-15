// context/CartContext.js
'use client';

import { createContext, useContext, useState, useMemo, useEffect } from 'react';

const CartContext = createContext();

const CART_STORAGE_KEY = 'vietian_fashion_cart';
const DISCOUNT_STORAGE_KEY = 'vietian_fashion_discount';

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountCodeInput, setDiscountCodeInput] = useState('');

    // --- NEW: Add a state to track if we have loaded from localStorage ---
    const [isLoaded, setIsLoaded] = useState(false);

    // --- MODIFIED: Load state from localStorage on initial client render ---
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
            console.error("Failed to load cart from localStorage", error);
            localStorage.removeItem(CART_STORAGE_KEY);
            localStorage.removeItem(DISCOUNT_STORAGE_KEY);
        } finally {
            // --- NEW: Signal that we are done loading ---
            setIsLoaded(true);
        }
    }, []); // Empty array ensures this runs only once on mount

    // --- MODIFIED: Save cartItems to localStorage, but only AFTER loading ---
    useEffect(() => {
        // --- NEW: Guard clause to prevent overwriting on initial load ---
        if (!isLoaded) {
            return;
        }
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        } catch (error) {
            console.error("Failed to save cart to localStorage", error);
        }
    }, [cartItems, isLoaded]); // --- NEW: Depend on isLoaded ---

    // --- MODIFIED: Save appliedDiscount to localStorage, but only AFTER loading ---
    useEffect(() => {
        // --- NEW: Guard clause ---
        if (!isLoaded) {
            return;
        }
        try {
            if (appliedDiscount) {
                localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(appliedDiscount));
            } else {
                localStorage.removeItem(DISCOUNT_STORAGE_KEY);
            }
        } catch (error) {
            console.error("Failed to save discount to localStorage", error);
        }
    }, [appliedDiscount, isLoaded]); // --- NEW: Depend on isLoaded ---


    // @unchanged (addToCart function)
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
        alert(`${product.name} (${variant.color} / ${variant.size}) added to cart!`);
    };

    // @unchanged (removeFromCart function)
    const removeFromCart = (variantId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== variantId));
    };

    // @unchanged (updateQuantity function)
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

    // @unchanged (clearCart function)
    const clearCart = () => {
        setCartItems([]);
        setAppliedDiscount(null);
        setDiscountCodeInput('');
    };

    // @unchanged (applyDiscountCode function)
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
            return { success: true, message: 'Discount applied!' };

        } catch (error) {
            setAppliedDiscount(null);
            console.error('Discount validation error:', error);
            return { success: false, message: error.message || 'Invalid discount code.' };
        }
    };

    // @unchanged (removeDiscountCode function)
    const removeDiscountCode = () => {
        setAppliedDiscount(null);
        setDiscountCodeInput('');
        alert('Discount removed.');
    };

    // @unchanged (useMemo calculations)
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

    // @unchanged (value object)
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