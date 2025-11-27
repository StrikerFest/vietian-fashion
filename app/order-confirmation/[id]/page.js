// app/order-confirmation/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';
import ReturnRequestModal from '@/components/account/ReturnRequestModal';
import OrderReceipt from '@/components/order/OrderReceipt';

export default function OrderConfirmationPage() {
    const params = useParams();
    const orderId = params?.id;

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

    useEffect(() => {
        if (orderId) {
            const fetchOrderDetails = async () => {
                setIsLoading(true);
                try {
                    // --- UPDATED QUERY: Include variant_attributes ---
                    const { data, error } = await supabase
                        .from('orders')
                        .select(`
                            id,
                            created_at,
                            subtotal,
                            total_amount,
                            status,
                            shipping_carrier,
                            tracking_number,
                            order_items (
                                id, 
                                quantity,
                                price_at_purchase,
                                custom_options, 
                                product_variants (
                                    sku, price,
                                    products ( name ),
                                    variant_attributes (
                                        attribute_value:categories (
                                            name, parent:parent_id ( name )
                                        )
                                    )
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

                    // --- TRANSFORM: Map attributes for the UI ---
                    const formattedOrder = {
                        ...data,
                        order_items: data.order_items.map(item => {
                            const attributes = {};
                            // Collect dynamic attributes
                            item.product_variants?.variant_attributes?.forEach(va => {
                                if (va.attribute_value?.parent?.name) {
                                    attributes[va.attribute_value.parent.name] = va.attribute_value.name;
                                }
                            });

                            return {
                                ...item,
                                product_variants: {
                                    ...item.product_variants,
                                    attributes // Pass this to OrderReceipt
                                }
                            };
                        })
                    };

                    setOrder(formattedOrder);
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
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    <p>Loading your order...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center text-center p-8">
                <h1 className="text-4xl font-bold mb-4">Order Not Found</h1>
                <p className="text-gray-400 mb-6">{`We couldn't find the order details. Please check your account for your order history.`}</p>
                <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                    Return to Homepage
                </Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <OrderReceipt order={order} />

            {order.status === 'delivered' && (
                <div className="max-w-4xl mx-auto mt-8 text-center pt-8 border-t border-gray-800">
                    <p className="text-gray-400 text-sm mb-4">
                        Need to return an item from this order?
                    </p>
                    <button
                        onClick={() => setIsReturnModalOpen(true)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm hover:underline transition-colors"
                    >
                        Request a Return / Refund
                    </button>
                </div>
            )}

            <ReturnRequestModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                order={order}
                onSuccess={() => alert("Return request submitted! We will review it shortly.")}
            />
        </main>
    );
}