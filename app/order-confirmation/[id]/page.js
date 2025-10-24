// app/order-confirmation/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient'; // We need direct access to Supabase client here

export default function OrderConfirmationPage(props) {
    const { id: orderId } = props.params;
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            const fetchOrderDetails = async () => {
                setIsLoading(true);
                try {
                    // --- Modify the query to include discount information ---
                    const { data, error } = await supabase
                        .from('orders')
                        .select(`
                            id,
                            created_at,
                            subtotal,
                            total_amount,
                            order_items (
                                quantity,
                                price_at_purchase,
                                product_variants (
                                    sku, color, size,
                                    products ( name )
                                )
                            ),
                            order_discounts (
                                discounts ( code, type, value )
                            )
                        `) // Fetch related discounts via order_discounts
                        .eq('id', orderId) //
                        .single(); // Expect only one order

                    if (error) throw error;
                    setOrder(data);
                } catch (error) {
                    console.error("Failed to fetch order details:", error);
                    setOrder(null);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchOrderDetails();
        }
    }, [orderId]);

    if (isLoading) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><p>Loading your order confirmation...</p></div>;
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center text-center p-8">
                <h1 className="text-4xl font-bold mb-4">Order Not Found</h1>
                <p className="text-gray-400 mb-6">We couldn't find the order details. Please check your account for your order history.</p>
                <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg">
                    Return to Homepage
                </Link>
            </div>
        );
    }

    // --- Extract discount information ---
    // Since order_discounts is a linking table, Supabase returns an array.
    // We assume only one discount per order for now.
    const appliedDiscount = order.order_discounts?.[0]?.discounts; //

    // --- Calculate discount amount (same logic as CartContext) ---
    let discountAmount = 0;
    if (appliedDiscount && order.subtotal) {
        if (appliedDiscount.type === 'percentage') { //
            const discountValue = Math.min(Math.max(appliedDiscount.value, 0), 100);
            discountAmount = (order.subtotal * discountValue) / 100;
        } else if (appliedDiscount.type === 'fixed') { //
            discountAmount = Math.min(appliedDiscount.value, order.subtotal);
        }
        discountAmount = Math.max(0, discountAmount);
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-2xl mx-auto text-center">
                <h1 className="text-4xl font-extrabold text-green-400 mb-4">Thank You For Your Order!</h1>
                <p className="text-lg text-gray-300">Your order has been placed successfully.</p>
                <p className="text-gray-400 mt-2">Order ID: <span className="font-mono">#{order.id}</span></p>

                <div className="bg-gray-800 rounded-lg text-left p-6 mt-8 space-y-4">
                    <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                    {order.order_items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center border-b border-gray-700 pb-2">
                            <div>
                                <p className="font-semibold">{item.product_variants.products.name}</p>
                                <p className="text-sm text-gray-400">{item.product_variants.color} / {item.product_variants.size}</p>
                            </div>
                            <div className="text-right">
                                <p>{item.quantity} x ${item.price_at_purchase.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                    {/* --- Display Subtotal, Discount, and Total --- */}
                    <div className="space-y-1 pt-4">
                         <div className="flex justify-between text-gray-300">
                            <span>Subtotal</span>
                            <span>${order.subtotal.toFixed(2)}</span>
                        </div>
                        {appliedDiscount && (
                             <div className="flex justify-between text-green-400">
                                <span>Discount ({appliedDiscount.code})</span>
                                <span>-${discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                         {/* Add Shipping if applicable */}
                         <div className="flex justify-between text-gray-300">
                            <span>Shipping</span>
                            <span>$0.00</span> {/* Assuming free for now */}
                        </div>
                        <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-bold text-lg">
                            <span>Total Paid</span>
                            <span>${order.total_amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <Link href="/products" className="inline-block mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg">
                    Continue Shopping
                </Link>
            </div>
        </main>
    );
}