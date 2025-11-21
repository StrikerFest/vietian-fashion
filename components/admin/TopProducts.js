'use client';
import Link from 'next/link';

export default function TopProducts({ products }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-md h-full">
            <h3 className="text-lg font-semibold text-white mb-4">🏆 Top Best Sellers</h3>
            <div className="space-y-4">
                {products.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between border-b border-gray-700 pb-2 last:border-0">
                        <div className="flex items-center">
                            <span className="text-gray-500 font-bold mr-3">#{index + 1}</span>
                            <div>
                                <Link href={`/admin/products?search=${product.name}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
                                    {product.name}
                                </Link>
                                <p className="text-xs text-gray-500">{product.sold} units sold</p>
                            </div>
                        </div>
                        <Link href={`/admin/products?edit=${product.id}`} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">
                            Edit
                        </Link>
                    </div>
                ))}
                {products.length === 0 && <p className="text-gray-500 text-sm">No sales data yet.</p>}
            </div>
        </div>
    );
}