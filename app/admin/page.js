// app/admin/page.js
'use client';

import Link from 'next/link';

export default function AdminDashboardPage() {
    // You could potentially fetch some basic stats here later for the dashboard (e.g., order count)

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Link to Product Management */}
                <Link href="/admin/products" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Products</h2>
                    <p className="text-gray-400 text-sm">Add, edit, delete products and manage variants, inventory, and tags.</p>
                </Link>

                {/* Link to Category Management */}
                <Link href="/admin/categories" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Categories</h2>
                    <p className="text-gray-400 text-sm">Organize products into hierarchical categories.</p>
                </Link>

                {/* Link to Collection Management */}
                <Link href="/admin/collections" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Collections</h2>
                    <p className="text-gray-400 text-sm">Create and manage curated product collections.</p>
                </Link>

                {/* Link to Order Management */}
                <Link href="/admin/orders" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Orders</h2>
                    <p className="text-gray-400 text-sm">View order details and update shipping information.</p>
                </Link>

                {/* Link to Discount Management */}
                <Link href="/admin/discounts" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Manage Discounts</h2>
                    <p className="text-gray-400 text-sm">Create and manage discount codes.</p>
                </Link>

                {/* Link to Review Management */}
                <Link href="/admin/reviews" className="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Moderate Reviews</h2>
                    <p className="text-gray-400 text-sm">Approve or delete customer product reviews.</p>
                </Link>

                {/* Add more links here as needed (e.g., Suppliers, Analytics) */}

            </div>
        </div>
    );
}