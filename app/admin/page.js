// app/admin/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Helper component for displaying stats
function StatCard({ title, value, linkTo = null }) {
    const content = (
        <div className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors shadow-md">
            <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    );
    return linkTo ? <Link href={linkTo}>{content}</Link> : content;
}


export default function AdminDashboardPage() {
    // @unchanged (State for analytics)
    const [analytics, setAnalytics] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        pendingReviews: 0,
    });
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

    // @unchanged (Fetch analytics data)
    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoadingAnalytics(true);
            try {
                const response = await fetch('/api/admin/analytics');
                if (!response.ok) throw new Error('Failed to fetch analytics');
                const data = await response.json();
                setAnalytics(data);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setIsLoadingAnalytics(false);
            }
        };

        fetchAnalytics();
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            {/* @unchanged (Analytics Stats Section) */}
            <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Orders"
                    value={isLoadingAnalytics ? '...' : analytics.totalOrders}
                    linkTo="/admin/orders"
                />
                <StatCard
                    title="Total Revenue"
                    value={isLoadingAnalytics ? '...' : `$${analytics.totalRevenue.toFixed(2)}`}
                />
                <StatCard
                    title="Pending Reviews"
                    value={isLoadingAnalytics ? '...' : analytics.pendingReviews}
                    linkTo="/admin/reviews"
                />
            </div>

            {/* --- Navigation Links Section --- */}
            <h2 className="text-2xl font-semibold mb-6">Management Sections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* @unchanged (Existing Links) */}
                <Link href="/admin/products" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Products</h2>
                    <p className="text-gray-400 text-sm">Add, edit, delete products and manage variants, inventory, and tags.</p>
                </Link>
                <Link href="/admin/categories" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Categories</h2>
                    <p className="text-gray-400 text-sm">Organize products into hierarchical categories.</p>
                </Link>
                <Link href="/admin/collections" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Collections</h2>
                    <p className="text-gray-400 text-sm">Create and manage curated product collections.</p>
                </Link>
                <Link href="/admin/orders" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Orders</h2>
                    <p className="text-gray-400 text-sm">View order details and update shipping information.</p>
                </Link>
                <Link href="/admin/discounts" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Discounts</h2>
                    <p className="text-gray-400 text-sm">Create and manage discount codes.</p>
                </Link>
                <Link href="/admin/reviews" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Moderate Reviews</h2>
                    <p className="text-gray-400 text-sm">Approve or delete customer product reviews.</p>
                </Link>
                <Link href="/admin/suppliers" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Suppliers</h2>
                    <p className="text-gray-400 text-sm">Add, edit, and delete supplier information.</p>
                </Link>

                {/* --- NEW: Link to Manage Returns --- */}
                <Link href="/admin/returns" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Returns</h2>
                    <p className="text-gray-400 text-sm">Approve or reject customer return requests.</p>
                </Link>

            </div>
        </div>
    );
}