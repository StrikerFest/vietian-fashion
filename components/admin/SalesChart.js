// components/admin/SalesChart.js
'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/format';

export default function SalesChart({ data }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-md h-80">
            <h3 className="text-lg font-semibold text-white mb-4">Xu hướng doanh thu (30 ngày qua)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                    <YAxis
                        stroke="#9CA3AF"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff' }}
                        itemStyle={{ color: '#818CF8' }}
                        formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                    />
                    <Line type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}