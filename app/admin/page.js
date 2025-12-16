// app/admin/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SalesChart from '@/components/admin/SalesChart';
import TopProducts from '@/components/admin/TopProducts';
import LowStockAlert from '@/components/admin/LowStockAlert';
import { formatCurrency } from '@/utils/format';

function StatCard({ title, value, color = "text-white" }) {
    return (
        <div className="block p-6 bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

export default function AdminDashboardPage() {
    const [data, setData] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        salesChartData: [],
        topProducts: [],
        lowStockItems: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/admin/analytics');
                if (!response.ok) throw new Error('Failed to fetch analytics');
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    // Calculate Average Order Value
    const averageOrderValue = data.totalOrders > 0 ? (data.totalRevenue / data.totalOrders) : 0;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="flex justify-between items-end mb-8">
                <h1 className="text-3xl font-bold">Tổng quan bảng điều khiển</h1>
                <p className="text-gray-400 text-sm">Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}</p>
            </div>

            {/* 1. Key Metrics Row */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Tổng doanh thu"
                    value={isLoading ? '...' : formatCurrency(data.totalRevenue)}
                    color="text-green-400"
                />
                <StatCard
                    title="Tổng đơn hàng"
                    value={isLoading ? '...' : data.totalOrders}
                />
                <StatCard
                    title="Giá trị đơn trung bình"
                    value={isLoading ? '...' : formatCurrency(averageOrderValue)}
                    color="text-indigo-400"
                />
            </div>

            {/* 2. Main Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Chart takes up 2/3 width */}
                <div className="lg:col-span-2">
                    {isLoading ? <div className="h-80 bg-gray-800 rounded animate-pulse"></div> : <SalesChart data={data.salesChartData} />}
                </div>

                {/* Quick Alerts */}
                <div className="lg:col-span-1">
                    {isLoading ? <div className="h-80 bg-gray-800 rounded animate-pulse"></div> : <LowStockAlert items={data.lowStockItems} />}
                </div>
            </div>

            {/* 3. Secondary Grid: Top Products & Quick Links */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {isLoading ? <div className="h-64 bg-gray-800 rounded animate-pulse"></div> : <TopProducts products={data.topProducts} />}

                {/* Navigation Shortcuts */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-white mb-4">Tác vụ nhanh</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/admin/products" className="p-4 bg-gray-700 hover:bg-indigo-600 rounded transition-colors text-center">
                            📦 Quản lý sản phẩm
                        </Link>
                        <Link href="/admin/orders" className="p-4 bg-gray-700 hover:bg-indigo-600 rounded transition-colors text-center">
                            🚚 Xử lý đơn hàng
                        </Link>
                        <Link href="/admin/discounts" className="p-4 bg-gray-700 hover:bg-indigo-600 rounded transition-colors text-center">
                            🏷️ Tạo mã giảm giá
                        </Link>
                        <Link href="/admin/inventory" className="p-4 bg-gray-700 hover:bg-indigo-600 rounded transition-colors text-center">
                            📋 Kiểm kê kho
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}