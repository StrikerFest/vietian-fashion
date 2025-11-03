// app/providers.js
'use client'; // This is crucial - it marks this as the boundary

import { CartProvider } from "@/context/CartContext"; //
import Navbar from "@/components/Navbar"; //

// This component will wrap all client-side context and components
export default function Providers({ children }) {
    return (
        <CartProvider>
            <Navbar />
            {children}
        </CartProvider>
    );
}