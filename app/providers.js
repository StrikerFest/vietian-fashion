// app/providers.js
'use client';

import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext"; // --- NEW ---
import { usePathname } from "next/navigation";

export default function Providers({ children }) {
    const pathname = usePathname();
    const isAdminPage = pathname.startsWith('/admin');

    if (isAdminPage) {
        // Admin pages might want their own Toast provider,
        // but for simplicity, let's wrap everything or just children here.
        // Ideally, Admin uses the same system.
        return (
            <ToastProvider>
                {children}
            </ToastProvider>
        );
    }

    return (
        <ToastProvider>
            <AuthProvider>
                <CartProvider>
                    <Navbar />
                    {children}
                </CartProvider>
            </AuthProvider>
        </ToastProvider>
    );
}