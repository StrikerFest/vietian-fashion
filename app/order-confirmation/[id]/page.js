// app/order-confirmation/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import OrderReceipt from '@/components/order/OrderReceipt';

export default function OrderConfirmationPage() {
    const params = useParams();
    const orderId = params?.id;
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!orderId) return;
        const fetchOrder = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                        id, created_at, subtotal, total_amount, status,
                        order_items ( quantity, price_at_purchase, product_variants ( sku, color, size, products ( name ) ) ),
                        order_discounts ( discounts ( code, type, value ) ),
                        addresses ( address_line_1, address_line_2, city, state_province_region, postal_code, country )
                    `)
                    .eq('id', orderId)
                    .single();

                if (error) throw error;
                setOrder(data);
            } catch (error) {
                console.error("Failed to fetch order:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    if (isLoading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading receipt...</div>;

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Order Not Found</h1>
                <Link href="/" className="text-indigo-400 hover:underline">Return Home</Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            <OrderReceipt order={order} />
        </main>
    );
}