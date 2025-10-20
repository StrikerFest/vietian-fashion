// context/CartContext.js
'use client';

import { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);

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

    // --- NEW: Function to clear the cart after checkout ---
    const clearCart = () => {
        setCartItems([]);
    };

    const subtotal = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [cartItems]);


    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        subtotal,
        clearCart, // Expose the new function
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