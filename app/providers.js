// app/providers.js
'use client';

import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";

// --- NEW: Import usePathname ---
import { usePathname } from "next/navigation";

// This component will wrap all client-side context and components
export default function Providers({ children }) {
    // --- NEW: Get the current path ---
    const pathname = usePathname();

    // --- NEW: Check if the current page is an admin page ---
    const isAdminPage = pathname.startsWith('/admin');

    // --- MODIFIED: Conditionally render all customer providers ---
    if (isAdminPage) {
        // If we are on an admin page, do *not* load the customer
        // AuthProvider or CartProvider. The admin layout will
        // provide its own context.
        return (
            <>
                {children}
            </>
        );
    }

    // If we are NOT on an admin page, load the normal
    // customer providers (Auth, Cart, and Navbar).
    return (
        <AuthProvider>
            <CartProvider>
                <Navbar />
                {children}
            </CartProvider>
        </AuthProvider>
    );
}