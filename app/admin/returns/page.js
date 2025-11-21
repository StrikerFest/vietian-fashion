// app/admin/returns/page.js
'use client';

import { useState, useEffect } from 'react';
import ReturnList from '@/components/admin/ReturnList';
import ReturnDetailsModal from '@/components/admin/ReturnDetailsModal';

export default function ReturnsPage() {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/returns');
            const data = await response.json();
            setRequests(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Return Requests</h1>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                {isLoading ? <p className="text-center text-gray-400">Loading...</p> : (
                    <ReturnList requests={requests} onView={setSelectedRequest} />
                )}
            </div>
            {selectedRequest && (
                <ReturnDetailsModal
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onUpdate={fetchRequests}
                />
            )}
        </div>
    );
}