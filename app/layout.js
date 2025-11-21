// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
// Remove the direct imports for CartProvider and Navbar
// import { CartProvider } from "@/context/CartContext";
// import Navbar from "@/components/Navbar";
// Import the new client-side wrapper
import Providers from "./providers";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

// This metadata export will now work correctly
export const metadata = {
    title: "AI Fashion Store",
    description: "Your next outfit, discovered by AI.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body className={inter.className}>
        {/* This <Providers> component is marked 'use client',
              but the RootLayout itself remains a Server Component,
              allowing 'metadata' to be exported.
            */}
        <Providers>
            {children}
            <Footer />
        </Providers>
        </body>
        </html>
    );
}