// components/admin/OrderExport.js
'use client';

import { useState } from 'react';

export default function OrderExport() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);

        // Build query parameters
        const params = new URLSearchParams();
        if (startDate) {
            params.append('start', new Date(startDate).toISOString());
        }
        if (endDate) {
            // Add 1 day to end date to make it inclusive
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            params.append('end', end.toISOString());
        }
        if (status) {
            params.append('status', status);
        }

        const exportUrl = `/api/orders/export?${params.toString()}`;

        try {
            const response = await fetch(exportUrl);
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Xuất đơn hàng thất bại.');
                } catch (jsonError) {
                    throw new Error(`Xuất đơn hàng thất bại. Trạng thái: ${response.status}`);
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
            alert(`Lỗi xuất đơn hàng: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Xuất đơn hàng</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Start Date */}
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium mb-1 text-gray-400">Ngày bắt đầu</label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                {/* End Date */}
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium mb-1 text-gray-400">Ngày kết thúc</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || ''}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                {/* Status Filter */}
                <div>
                    <label htmlFor="status" className="block text-sm font-medium mb-1 text-gray-400">Trạng thái</label>
                    <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="pending">Chờ xử lý</option>
                        <option value="paid">Đã thanh toán</option>
                        <option value="shipped">Đã vận chuyển</option>
                        <option value="delivered">Đã giao hàng</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>
                {/* Export Button */}
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    {isExporting ? 'Đang xuất...' : 'Xuất CSV'}
                </button>
            </div>
        </div>
    );
}