'use client';
import Link from 'next/link';

export default function LowStockAlert({ items }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-md h-full border-l-4 border-red-500">
            <h3 className="text-lg font-semibold text-white mb-4">⚠️ Cảnh báo tồn kho thấp</h3>
            <div className="space-y-3">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                        <div>
                            <p className="text-gray-300 font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.variant}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-red-400 font-bold">Còn {item.stock}</span>
                            <br/>
                            <Link href="/admin/purchase-orders/create" className="text-xs text-indigo-400 hover:underline">
                                Nhập hàng
                            </Link>
                        </div>
                    </div>
                ))}
                {items.length === 0 && <p className="text-green-400 text-sm">Tất cả mức tồn kho đều ổn định!</p>}
            </div>
        </div>
    );
}