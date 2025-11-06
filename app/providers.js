// app/providers.js
'use client';

import { CartProvider } from "@/context/CartContext"; //
import Navbar from "@/components/Navbar"; //
import { AuthProvider } from "@/context/AuthContext";

// This component will wrap all client-side context and components
export default function Providers({ children }) {
    return (
        <AuthProvider>
            <CartProvider>
                <Navbar />
                {children}
            </CartProvider>
        </AuthProvider>
    );
}