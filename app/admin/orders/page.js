// app/admin/orders/page.js
'use client';

import { useState, useEffect } from 'react';

// @unchanged (StarRatingDisplay component remains the same)
function StarRatingDisplay({ rating }) {
    const totalStars = 5;
    let stars = [];
    for (let i = 1; i <= totalStars; i++) {
        stars.push(
            <span key={i} className={`text-xl ${i <= rating ? 'text-yellow-400' : 'text-gray-600'}`}>
                ★
            </span>
        );
    }
    return <div className="flex">{stars}</div>;
}


export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null); // For the details modal

    // --- NEW: State for tracking info form within the modal ---
    const [shippingCarrier, setShippingCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isSavingTracking, setIsSavingTracking] = useState(false);

    // @unchanged (fetchOrders logic remains the same)
    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                // Fetch orders - This endpoint includes discount info
                const response = await fetch('/api/orders');
                if (!response.ok) throw new Error('Failed to fetch orders');
                const data = await response.json();
                setOrders(data || []);
            } catch (error) {
                console.error(error);
            }
            setIsLoading(false);
        };
        fetchOrders();
    }, []);

    // --- NEW: Effect to populate tracking form when modal opens ---
    useEffect(() => {
        if (selectedOrder) {
            setShippingCarrier(selectedOrder.shipping_carrier || ''); //
            setTrackingNumber(selectedOrder.tracking_number || ''); //
        } else {
            // Reset form when modal closes
            setShippingCarrier('');
            setTrackingNumber('');
            setIsSavingTracking(false);
        }
    }, [selectedOrder]);


    // --- NEW: Handler to save tracking info ---
    const handleSaveTracking = async () => {
        if (!selectedOrder) return;
        // Basic check: require at least one field
        if (!shippingCarrier && !trackingNumber) {
            alert('Please enter Shipping Carrier or Tracking Number.');
            return;
        }

        setIsSavingTracking(true);
        try {
            const response = await fetch(`/api/orders/${selectedOrder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipping_carrier: shippingCarrier, //
                    tracking_number: trackingNumber, //
                    // Optionally update status here too if needed
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update tracking info');
            }

            const { order: updatedOrder } = await response.json();

            // Update the main orders list state
            setOrders(prevOrders =>
                prevOrders.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
            );
            // Update the selectedOrder state as well so modal shows new data
            setSelectedOrder(updatedOrder);

            alert('Tracking information saved successfully!');

        } catch (error) {
            console.error('Error saving tracking info:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSavingTracking(false);
        }
    };


    // @unchanged (OrderStatusBadge component remains the same)
    const OrderStatusBadge = ({ status }) => {
        const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
        switch (status?.toLowerCase()) {
            case 'paid': return <span className={`${baseClasses} bg-green-800 text-green-200`}>Paid</span>;
            case 'shipped': return <span className={`${baseClasses} bg-blue-800 text-blue-200`}>Shipped</span>;
            case 'delivered': return <span className={`${baseClasses} bg-purple-800 text-purple-200`}>Delivered</span>;
            case 'cancelled': return <span className={`${baseClasses} bg-red-800 text-red-200`}>Cancelled</span>;
            default: return <span className={`${baseClasses} bg-gray-700 text-gray-300`}>Pending</span>;
        }
    };

    // @unchanged (getDiscountDetails helper function)
    const getDiscountDetails = (order) => {
        if (!order || !order.order_discounts || order.order_discounts.length === 0) { //
            return { text: null, amount: 0 };
        }
        const discountInfo = order.order_discounts[0]?.discounts; //
        if (!discountInfo || order.subtotal === undefined) {
             return { text: null, amount: 0 };
        }
        let amount = 0;
        let text = '';
        if (discountInfo.type === 'percentage') { //
             const discountValue = Math.min(Math.max(discountInfo.value, 0), 100);
             amount = (order.subtotal * discountValue) / 100;
             text = `Discount (${discountInfo.code} - ${discountValue}%)`;
        } else if (discountInfo.type === 'fixed') { //
             amount = Math.min(discountInfo.value, order.subtotal);
             text = `Discount (${discountInfo.code} - $${Number(discountInfo.value).toFixed(2)})`;
        }
        amount = Math.max(0, amount);
        return { text, amount };
    }


    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Orders</h1>

            {/* @unchanged (Main orders table display logic) */}
             <div className="bg-gray-800 p-6 rounded-lg">
                {isLoading ? (
                    <p>Loading orders...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900">
                                <tr className="border-b border-gray-600">
                                    <th className="p-3">Order ID</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3">Total</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                            {orders.map(order => (
                                <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3 font-mono text-sm">#{order.id}</td>
                                    <td className="p-3">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="p-3">{order.users?.email || 'Guest'}</td>
                                    <td className="p-3">${order.total_amount.toFixed(2)}</td>
                                    <td className="p-3"><OrderStatusBadge status={order.status} /></td>
                                    <td className="p-3">
                                        <button onClick={() => setSelectedOrder(order)} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                         { !isLoading && orders.length === 0 && <p className="text-gray-500 mt-4 text-center">No orders found.</p>}
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* @unchanged (Modal Header) */}
                         <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Order #{selectedOrder.id}</h2>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">&times;</button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* @unchanged (Order Items display) */}
                            <div>
                                <h3 className="font-semibold mb-2">Order Items</h3>
                                <div className="space-y-2">
                                    {selectedOrder.order_items.map(item => (
                                        <div key={item.product_variants.id} className="flex justify-between items-center text-sm p-2 bg-gray-900/50 rounded">
                                            <div>
                                                <p className="font-medium">{item.product_variants.products.name}</p>
                                                <p className="text-gray-400">{item.product_variants.sku} - {item.product_variants.color} / {item.product_variants.size}</p>
                                            </div>
                                            <p>{item.quantity} x ${item.price_at_purchase.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* @unchanged (Totals display) */}
                             <div>
                                <h3 className="font-semibold mb-2">Totals</h3>
                                <div className="space-y-1 text-sm bg-gray-900/50 p-3 rounded">
                                    {/* ... totals details ... */}
                                     <div className="flex justify-between">
                                        <span className="text-gray-400">Subtotal</span>
                                        <span>${selectedOrder.subtotal?.toFixed(2) ?? '0.00'}</span>
                                    </div>
                                    {getDiscountDetails(selectedOrder).text && (
                                         <div className="flex justify-between text-green-400">
                                            <span>{getDiscountDetails(selectedOrder).text}</span>
                                            <span>-${getDiscountDetails(selectedOrder).amount.toFixed(2)}</span>
                                        </div>
                                    )}
                                     <div className="flex justify-between">
                                        <span className="text-gray-400">Shipping</span>
                                        <span>$0.00</span> {/* Placeholder */}
                                    </div>
                                    <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between font-bold text-base">
                                        <span>Grand Total</span>
                                        <span>${selectedOrder.total_amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* @unchanged (Shipping Address display) */}
                            <div>
                                <h3 className="font-semibold mb-2">Shipping Address</h3>
                                {/* ... address details ... */}
                                 {selectedOrder.addresses ? (
                                    <div className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded">
                                        <p>{selectedOrder.addresses.address_line_1}</p>
                                        {selectedOrder.addresses.address_line_2 && <p>{selectedOrder.addresses.address_line_2}</p>}
                                        <p>{selectedOrder.addresses.city}, {selectedOrder.addresses.state_province_region} {selectedOrder.addresses.postal_code}</p>
                                        <p>{selectedOrder.addresses.country}</p>
                                    </div>
                                ) : <p className="text-sm text-gray-500">No address provided (guest checkout).</p>}
                            </div>

                            {/* --- NEW: Tracking Information Form --- */}
                            <div>
                                <h3 className="font-semibold mb-2">Shipping Tracking</h3>
                                <div className="space-y-3 bg-gray-900/50 p-4 rounded">
                                    <div>
                                        <label htmlFor="shipping_carrier" className="block text-sm font-medium mb-1">Shipping Carrier</label>
                                        <input
                                            type="text"
                                            id="shipping_carrier"
                                            value={shippingCarrier}
                                            onChange={(e) => setShippingCarrier(e.target.value)}
                                            placeholder="e.g., FedEx, UPS, USPS"
                                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                                        />
                                    </div>
                                    <div>
                                         <label htmlFor="tracking_number" className="block text-sm font-medium mb-1">Tracking Number</label>
                                         <input
                                            type="text"
                                            id="tracking_number"
                                            value={trackingNumber}
                                            onChange={(e) => setTrackingNumber(e.target.value)}
                                            placeholder="Enter tracking number"
                                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                                        />
                                    </div>
                                     <button
                                        onClick={handleSaveTracking}
                                        disabled={isSavingTracking}
                                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                                     >
                                        {isSavingTracking ? 'Saving...' : 'Save Tracking Info'}
                                    </button>
                                </div>
                            </div>
                        </div>
                         {/* @unchanged (Modal Footer) */}
                        <div className="p-4 bg-gray-900/50 text-right">
                            <button onClick={() => setSelectedOrder(null)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}