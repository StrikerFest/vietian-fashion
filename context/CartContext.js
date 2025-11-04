// context/CartContext.js
'use client';

import { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    // --- NEW: Discount State ---
    const [appliedDiscount, setAppliedDiscount] = useState(null); // Stores the full discount object if valid
    const [discountCodeInput, setDiscountCodeInput] = useState(''); // Stores the user's input

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
                productName: product.name,
                imageUrl: product.image_url || 'https://placehold.co/100x100/1F2937/FFFFFF?text=Item',
                quantity: 1
            }];
        });
        alert(`${product.name} (${variant.color} / ${variant.size}) added to cart!`);
    };

    const removeFromCart = (variantId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== variantId));
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
        setAppliedDiscount(null); // Also clear discount on cart clear
        setDiscountCodeInput('');
    };

    // --- NEW: Function to apply a discount code ---
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

            setAppliedDiscount(data.discount); // Store the valid discount object
            setDiscountCodeInput(data.discount.code); // Update input field to show the applied code
            return { success: true, message: 'Discount applied!' };

        } catch (error) {
            setAppliedDiscount(null); // Clear discount if validation fails
            console.error('Discount validation error:', error);
            return { success: false, message: error.message || 'Invalid discount code.' };
        }
    };

    // --- NEW: Function to remove the applied discount ---
    const removeDiscountCode = () => {
        setAppliedDiscount(null);
        setDiscountCodeInput('');
        alert('Discount removed.');
    };


    // --- Calculate Subtotal (unchanged) ---
    const subtotal = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [cartItems]);

    // --- NEW: Calculate Discount Amount ---
    const discountAmount = useMemo(() => {
        if (!appliedDiscount || subtotal === 0) {
            return 0;
        }

        if (appliedDiscount.type === 'percentage') { //
            // Ensure value is treated as percentage (e.g., 10 for 10%)
            const discountValue = Math.min(Math.max(appliedDiscount.value, 0), 100); // Clamp between 0 and 100
            return (subtotal * discountValue) / 100;
        } else if (appliedDiscount.type === 'fixed') { //
            // Ensure fixed discount doesn't exceed subtotal
            return Math.min(appliedDiscount.value, subtotal);
        }

        return 0; // Should not happen with validation
    }, [appliedDiscount, subtotal]);

    // --- NEW: Calculate Final Total ---
    const total = useMemo(() => {
        const calculatedTotal = subtotal - discountAmount;
        return Math.max(0, calculatedTotal); // Ensure total doesn't go below zero
    }, [subtotal, discountAmount]);

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        // New discount properties and functions
        appliedDiscount,
        discountCodeInput,
        setDiscountCodeInput, // Allow cart page to update the input field directly
        applyDiscountCode,
        removeDiscountCode,
        discountAmount,
        total, // Use this for the final total display
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