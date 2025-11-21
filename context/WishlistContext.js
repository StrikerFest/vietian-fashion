// context/WishlistContext.js
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const { session } = useAuth();
    const { addToast } = useToast();

    // Load Wishlist on Login
    useEffect(() => {
        if (!session) {
            setWishlistIds(new Set());
            return;
        }

        const fetchWishlist = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/account/wishlist');
                if (res.ok) {
                    const data = await res.json();
                    // Store just the IDs for quick lookup
                    const ids = new Set(data.map(item => item.id));
                    setWishlistIds(ids);
                }
            } catch (error) {
                console.error("Failed to sync wishlist", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWishlist();
    }, [session]);

    // Actions
    const toggleWishlist = useCallback(async (productId) => {
        if (!session) {
            addToast("Please login to save items.", "info");
            return;
        }

        const id = Number(productId);
        const isRemoving = wishlistIds.has(id);

        // 1. Optimistic Update (Instant UI change)
        setWishlistIds(prev => {
            const next = new Set(prev);
            if (isRemoving) next.delete(id);
            else next.add(id);
            return next;
        });

        // 2. API Call
        try {
            if (isRemoving) {
                await fetch(`/api/account/wishlist?productId=${id}`, { method: 'DELETE' });
                addToast("Removed from wishlist", "info");
            } else {
                await fetch('/api/account/wishlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: id })
                });
                addToast("Added to wishlist!", "success");
            }
        } catch (error) {
            // Revert on error
            console.error(error);
            addToast("Failed to update wishlist", "error");
            setWishlistIds(prev => {
                const next = new Set(prev);
                if (isRemoving) next.add(id);
                else next.delete(id);
                return next;
            });
        }
    }, [session, wishlistIds, addToast]);

    const isInWishlist = useCallback((productId) => {
        return wishlistIds.has(Number(productId));
    }, [wishlistIds]);

    return (
        <WishlistContext.Provider value={{ wishlistIds, toggleWishlist, isInWishlist, isLoading }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    return useContext(WishlistContext);
}