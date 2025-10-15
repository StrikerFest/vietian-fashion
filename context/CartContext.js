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

    // --- NEW: Function to remove an item completely ---
    const removeFromCart = (variantId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== variantId));
    };

    // --- NEW: Function to update an item's quantity ---
    const updateQuantity = (variantId, newQuantity) => {
        if (newQuantity < 1) {
            // If quantity is less than 1, remove the item
            removeFromCart(variantId);
        } else {
            setCartItems(prevItems =>
                prevItems.map(item =>
                    item.id === variantId ? { ...item, quantity: newQuantity } : item
                )
            );
        }
    };

    // --- NEW: Calculate the subtotal ---
    // useMemo ensures this calculation only runs when cartItems changes
    const subtotal = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [cartItems]);


    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        subtotal,
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