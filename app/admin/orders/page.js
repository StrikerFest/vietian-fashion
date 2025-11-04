// app/admin/orders/page.js
'use client';

import { useState, useEffect } from 'react';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // @unchanged (State for tracking info modal)
    const [shippingCarrier, setShippingCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isSavingTracking, setIsSavingTracking] = useState(false);

    // --- NEW: State for export filters ---
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // --- NEW: State for cancellation ---
    const [isCancelling, setIsCancelling] = useState(false);

    // @unchanged (fetchOrders logic)
    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/orders'); //
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

    // @unchanged (Effect to populate tracking form)
    useEffect(() => {
        if (selectedOrder) {
            setShippingCarrier(selectedOrder.shipping_carrier || ''); //
            setTrackingNumber(selectedOrder.tracking_number || ''); //
        } else {
            // Reset all modal-specific states when it closes
            setShippingCarrier('');
            setTrackingNumber('');
            setIsSavingTracking(false);
            setIsCancelling(false); // Reset cancelling state
        }
    }, [selectedOrder]);


    // @unchanged (Handler to save tracking info)
    const handleSaveTracking = async () => {
        if (!selectedOrder) return;
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
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update tracking info');
            }
            const { order: updatedOrder } = await response.json();
            setOrders(prevOrders =>
                prevOrders.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
            );
            setSelectedOrder(updatedOrder);
            alert('Tracking information saved successfully!');
        } catch (error) {
            console.error('Error saving tracking info:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSavingTracking(false);
        }
    };

    // --- NEW: Handler for exporting orders ---
    const handleExport = async () => {
        setIsExporting(true);

        // Build query parameters
        const params = new URLSearchParams();
        if (filterStartDate) {
            params.append('start', new Date(filterStartDate).toISOString());
        }
        if (filterEndDate) {
            // Add 1 day to end date to make it inclusive (e.g., end of 2023-10-31)
            const endDate = new Date(filterEndDate);
            endDate.setDate(endDate.getDate() + 1);
            params.append('end', endDate.toISOString());
        }
        if (filterStatus) {
            params.append('status', filterStatus);
        }

        const exportUrl = `/api/orders/export?${params.toString()}`;

        try {
            const response = await fetch(exportUrl);
            if (!response.ok) {
                 try {
                     const errorData = await response.json();
                     throw new Error(errorData.error || 'Failed to export orders.');
                } catch (jsonError) {
                    throw new Error(`Failed to export orders. Status: ${response.status}`);
                }
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Error exporting orders: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    // --- NEW: Handler for cancelling an order ---
    const handleCancelOrder = async () => {
        if (!selectedOrder) return;
        if (!confirm('Are you sure you want to cancel this order? This will restock the items and cannot be undone.')) {
            return;
        }

        setIsCancelling(true);
        try {
            // Call the same API endpoint, but with a different body
            const response = await fetch(`/api/orders/${selectedOrder.id}`, { ///route.js]
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'cancelled' // Send the cancel signal
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to cancel order');
            }

            const { order: updatedOrder, message } = await response.json();

            // Update the main orders list state
            setOrders(prevOrders =>
                prevOrders.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
            );
            // Update the selectedOrder state to reflect the change in the modal
            setSelectedOrder(updatedOrder);

            alert(message || 'Order cancelled successfully!');

        } catch (error) {
            console.error('Error cancelling order:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsCancelling(false);
        }
    };


    // @unchanged (OrderStatusBadge component)
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

            {/* --- NEW: Export Orders Section --- */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
                <h2 className="text-xl font-semibold mb-4">Export Orders</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Start Date */}
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium mb-1">Start Date</label>
                        <input
                            type="date"
                            id="startDate"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-gray-300"
                        />
                    </div>
                    {/* End Date */}
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium mb-1">End Date</label>
                        <input
                            type="date"
                            id="endDate"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            min={filterStartDate || ''} // End date cannot be before start date
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-gray-300"
                        />
                    </div>
                    {/* Status Filter */}
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                        <select
                            id="status"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        {isExporting ? 'Exporting...' : 'Export Orders'}
                    </button>
                </div>
            </div>

            {/* --- Existing Orders List --- */}
            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Existing Orders</h2>
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
                            <OrderStatusBadge status={selectedOrder.status} /> {/* Show status in header */}
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

                            {/* --- MODIFIED: Tracking Form (conditionally render) --- */}
                            {/* Only show tracking form if order is not cancelled or delivered */}
                            {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                                <div>
                                    <h3 className="font-semibold mb-2">Shipping Tracking</h3>
                                    <div className="space-y-3 bg-gray-900/50 p-4 rounded">
                                        {/* ... (shipping/tracking inputs and save button) ... */}
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
                            )}
                        </div>

                         {/* --- MODIFIED: Modal Footer with Cancel Button --- */}
                        <div className="p-4 bg-gray-900/50 flex justify-between items-center">
                            {/* Cancel Button (Danger Zone) */}
                            <button
                                onClick={handleCancelOrder}
                                disabled={isCancelling || selectedOrder.status === 'cancelled' || selectedOrder.status === 'delivered'}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                            </button>

                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}