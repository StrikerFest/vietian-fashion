// app/order-confirmation/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation'; // Use useParams for consistency

export default function OrderConfirmationPage() {
    const params = useParams();
    const orderId = params?.id;

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            const fetchOrderDetails = async () => {
                setIsLoading(true);
                try {
                    // --- MODIFIED: Include addresses in the query ---
                    const { data, error } = await supabase
                        .from('orders')
                        .select(`
                            id,
                            created_at,
                            subtotal,
                            total_amount,
                            status,
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
                            ),
                            addresses (
                                address_line_1,
                                address_line_2,
                                city,
                                state_province_region,
                                postal_code,
                                country
                            )
                        `)
                        .eq('id', orderId)
                        .single();

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
                <p className="text-gray-400 mb-6">{`We couldn't find the order details. Please check your account for your order history.`}</p>
                <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg">
                    Return to Homepage
                </Link>
            </div>
        );
    }

    const appliedDiscount = order.order_discounts?.[0]?.discounts;
    const shippingAddress = order.addresses;

    // Calculate discount amount for display
    let discountAmount = 0;
    if (appliedDiscount && order.subtotal) {
        if (appliedDiscount.type === 'percentage') {
            const discountValue = Math.min(Math.max(appliedDiscount.value, 0), 100);
            discountAmount = (order.subtotal * discountValue) / 100;
        } else if (appliedDiscount.type === 'fixed') {
            discountAmount = Math.min(appliedDiscount.value, order.subtotal);
        }
        discountAmount = Math.max(0, discountAmount);
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-green-400 mb-4">Thank You For Your Order!</h1>
                    <p className="text-lg text-gray-300">Your order has been placed successfully.</p>
                    <p className="text-gray-400 mt-2">Order ID: <span className="font-mono text-white">#{order.id}</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* --- Order Items Column --- */}
                    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                        <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Order Summary</h2>
                        <div className="space-y-4">
                            {order.order_items.map((item, index) => (
                                <div key={index} className="flex justify-between items-start text-sm">
                                    <div>
                                        <p className="font-semibold">{item.product_variants.products.name}</p>
                                        <p className="text-gray-400">{item.product_variants.color} / {item.product_variants.size}</p>
                                        <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p>${(item.price_at_purchase * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="space-y-1 pt-4 border-t border-gray-700 text-sm">
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
                            <div className="flex justify-between text-gray-300">
                                <span>Shipping</span>
                                <span>Free</span>
                            </div>
                            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-bold text-lg text-white">
                                <span>Total Paid</span>
                                <span>${order.total_amount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* --- NEW: Shipping & Details Column --- */}
                    <div className="space-y-6">
                        {/* Shipping Address */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Shipping To</h2>
                            {shippingAddress ? (
                                <div className="text-gray-300 text-sm space-y-1">
                                    <p className="font-semibold text-white">{shippingAddress.address_line_1}</p>
                                    {shippingAddress.address_line_2 && <p>{shippingAddress.address_line_2}</p>}
                                    <p>{shippingAddress.city}, {shippingAddress.state_province_region} {shippingAddress.postal_code}</p>
                                    <p>{shippingAddress.country}</p>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No shipping address provided (Guest Checkout or Digital Item).</p>
                            )}
                        </div>

                        {/* Order Status / Info */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Order Details</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status</span>
                                    <span className="capitalize bg-gray-700 px-2 py-0.5 rounded text-xs font-semibold">{order.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Date</span>
                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="mt-4 pt-4">
                                    <p className="text-gray-400 text-xs">
                                        You will receive an email confirmation shortly. You can track your order status in your account.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center mt-12">
                    <Link href="/products" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors">
                        Continue Shopping
                    </Link>
                </div>
            </div>
        </main>
    );
}