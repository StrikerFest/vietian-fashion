// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar"; // Import the provider

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "AI Fashion Store",
    description: "Your next outfit, discovered by AI.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body className={inter.className}>
        <CartProvider>
            <Navbar /> {/* Add the Navbar here */}
            {children}
        </CartProvider>
        </body>
        </html>
    );
}