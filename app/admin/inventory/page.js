// app/admin/inventory/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import InventoryAdjustForm from '@/components/admin/InventoryAdjustForm';
import InventoryLogList from '@/components/admin/InventoryLogList';
import PaginationControls from '@/components/ui/PaginationControls'; // --- NEW ---

export default function InventoryPage() {
    const [logs, setLogs] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);

    // --- NEW: Pagination State for Logs ---
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Separate fetch for logs to handle pagination updates independently
    const fetchLogs = useCallback(async () => {
        setIsLoadingLogs(true);
        try {
            const res = await fetch(`/api/admin/inventory/logs?page=${page}&limit=${limit}`);
            const result = await res.json();

            if (result.data) {
                setLogs(result.data);
                setTotalItems(result.meta.total);
                setTotalPages(result.meta.totalPages);
            } else {
                setLogs(result || []);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setIsLoadingLogs(false);
        }
    }, [page, limit]);

    // Initial data load
    useEffect(() => {
        fetchLogs();
        // Fetch products once for the dropdown (not paginated for now)
        fetch('/api/products').then(res => res.json()).then(data => setProducts(data || []));
    }, [fetchLogs]);

    const handleAdjust = async (data) => {
        const response = await fetch('/api/admin/inventory/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Adjustment failed');
        }

        alert('Inventory updated successfully.');
        fetchLogs(); // Refresh logs to show new entry
        // Optionally refresh products to update local stock counts if needed
        fetch('/api/products').then(res => res.json()).then(data => setProducts(data || []));
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handleLimitChange = (newLimit) => {
        setLimit(newLimit);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Inventory Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Adjustment Form */}
                <div className="lg:col-span-1">
                    <InventoryAdjustForm products={products} onAdjust={handleAdjust} />
                </div>

                {/* Right: Audit Log */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Audit Log</h2>
                            <span className="text-sm text-gray-400">Total Entries: {totalItems}</span>
                        </div>

                        {isLoadingLogs ? (
                            <p className="text-center text-gray-400 py-8">Loading logs...</p>
                        ) : (
                            <>
                                <InventoryLogList logs={logs} />
                                <PaginationControls
                                    currentPage={page}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    limit={limit}
                                    onPageChange={handlePageChange}
                                    onLimitChange={handleLimitChange}
                                    isLoading={isLoadingLogs}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}