// app/admin/returns/page.js
'use client';

import { useState, useEffect } from 'react';

// Helper component for status badges
function StatusBadge({ status }) {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status?.toLowerCase()) {
        case 'pending': return <span className={`${baseClasses} bg-yellow-800 text-yellow-200`}>Pending</span>;
        case 'approved': return <span className={`${baseClasses} bg-green-800 text-green-200`}>Approved</span>;
        case 'rejected': return <span className={`${baseClasses} bg-red-800 text-red-200`}>Rejected</span>;
        case 'processed': return <span className={`${baseClasses} bg-blue-800 text-blue-200`}>Processed</span>; // 'approved' status from RPC will set order to 'refunded'
        case 'refunded': return <span className={`${baseClasses} bg-blue-800 text-blue-200`}>Refunded</span>;
        case 'partially-refunded': return <span className={`${baseClasses} bg-indigo-800 text-indigo-200`}>Part-Refunded</span>;
        default: return <span className={`${baseClasses} bg-gray-700 text-gray-300`}>{status}</span>;
    }
}

export default function ReturnsPage() {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false); // For modal buttons

    // Fetch all return requests
    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/returns'); // Fetches from the GET route
            if (!response.ok) throw new Error('Failed to fetch return requests');
            const data = await response.json();
            setRequests(data || []);
        } catch (error) {
            console.error(error);
            alert(`Error fetching requests: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Open modal and set admin notes from request
    const handleViewDetails = (request) => {
        setSelectedRequest(request);
        setAdminNotes(request.admin_notes || '');
    };

    // Close modal and reset
    const handleCloseModal = () => {
        setSelectedRequest(null);
        setAdminNotes('');
        setIsProcessing(false);
    };

    // Handle Approve or Reject
    const handleUpdateRequest = async (status) => {
        if (!selectedRequest) return;

        const confirmMessage = status === 'approved'
            ? 'Are you sure you want to approve this return? This will restock items and update the order status.'
            : 'Are you sure you want to reject this return?';

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch(`/api/returns/${selectedRequest.id}`, { ///route.js]
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: status, // 'approved' or 'rejected'
                    admin_notes: adminNotes //
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${status} request.`);
            }

            const { data: updatedRequestData, message } = await response.json();

            // Refetch all requests to get the most up-to-date list
            // (especially to update the main order status if changed by RPC)
            await fetchRequests();

            // Close the modal
            handleCloseModal();

            alert(message || `Request ${status} successfully.`);

        } catch (error) {
            console.error(`Error processing return:`, error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper to calculate total value of the return
    const calculateReturnTotal = (items) => {
        if (!items) return 0;
        return items.reduce((total, item) => {
            const price = item.order_items?.price_at_purchase || 0;
            return total + (price * item.quantity);
        }, 0);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Return Requests</h1>

            {/* --- List of Return Requests --- */}
            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">All Requests</h2>
                {isLoading ? (
                    <p>Loading requests...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900">
                                <tr>
                                    <th className="p-3">Request ID</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Order ID</th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3">Items</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-sm">
                                        <td className="p-3 font-mono">#{req.id}</td>
                                        <td className="p-3">{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td className="p-3 font-mono">#{req.order_id}</td>
                                        <td className="p-3">{req.users?.email || 'Guest'}</td>
                                        <td className="p-3">{req.return_items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</td>
                                        <td className="p-3"><StatusBadge status={req.status} /></td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => handleViewDetails(req)}
                                                className="text-indigo-400 hover:text-indigo-300 font-semibold"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        { !isLoading && requests.length === 0 && <p className="text-gray-500 mt-4 text-center">No return requests found.</p>}
                    </div>
                )}
            </div>

            {/* --- Return Details Modal --- */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Return Request #{selectedRequest.id}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white">&times;</button>
                        </div>
                        <div className="p-6 space-y-6">

                            {/* Request Summary */}
                            <div className="space-y-1 text-sm bg-gray-900/50 p-3 rounded">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Order ID:</span>
                                    <span className="font-mono">#{selectedRequest.order_id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Customer:</span>
                                    <span>{selectedRequest.users?.email || 'Guest'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status:</span>
                                    <StatusBadge status={selectedRequest.status} />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Return Value:</span>
                                    <span className="font-semibold">${calculateReturnTotal(selectedRequest.return_items).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Customer Reason */}
                            <div>
                                <h3 className="font-semibold mb-2">Customer Reason</h3>
                                <p className="text-sm text-gray-300 p-3 bg-gray-900/50 rounded min-h-[50px]">
                                    {selectedRequest.reason || <span className="italic text-gray-500">No reason provided.</span>}
                                </p>
                            </div>

                            {/* Items to Return */}
                            <div>
                                <h3 className="font-semibold mb-2">Items in Request</h3>
                                <div className="space-y-2">
                                    {selectedRequest.return_items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-gray-900/50 rounded">
                                            <div>
                                                <p className="font-medium">{item.order_items?.product_variants?.products?.name || 'Product Not Found'}</p>
                                                <p className="text-gray-400">{item.order_items?.product_variants?.sku} - {item.order_items?.product_variants?.color} / {item.order_items?.product_variants?.size}</p>
                                            </div>
                                            <div className="text-right">
                                                <p>{item.quantity} x ${item.order_items?.price_at_purchase.toFixed(2)}</p>
                                                <p className="text-xs text-gray-400">Restock: {item.should_restock ? 'Yes' : 'No'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Admin Actions */}
                            {selectedRequest.status === 'pending' && (
                                <div>
                                    <h3 className="font-semibold mb-2">Admin Notes</h3>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        rows="3"
                                        placeholder="Add notes for this decision (optional)..."
                                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                                    />
                                </div>
                            )}
                            {selectedRequest.admin_notes && selectedRequest.status !== 'pending' && (
                               <div>
                                    <h3 className="font-semibold mb-2">Admin Notes</h3>
                                    <p className="text-sm text-gray-300 p-3 bg-gray-900/50 rounded min-h-[50px]">
                                        {selectedRequest.admin_notes}
                                    </p>
                               </div>
                            )}

                        </div>
                        <div className="p-4 bg-gray-900/50 flex justify-between items-center">
                            {/* Show actions only if the request is pending */}
                            {selectedRequest.status === 'pending' ? (
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleUpdateRequest('approved')}
                                        disabled={isProcessing}
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500"
                                    >
                                        {isProcessing ? 'Processing...' : 'Approve Return'}
                                    </button>
                                    <button
                                        onClick={() => handleUpdateRequest('rejected')}
                                        disabled={isProcessing}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500"
                                    >
                                        {isProcessing ? 'Processing...' : 'Reject Return'}
                                    </button>
                                </div>
                            ) : (
                                // If already processed, just show a placeholder or nothing
                                <div>
                                    <span className="text-sm text-gray-400 italic">This request has been {selectedRequest.status}.</span>
                                </div>
                            )}
                            <button onClick={handleCloseModal} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}