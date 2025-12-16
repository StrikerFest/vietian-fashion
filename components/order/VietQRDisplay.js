// components/order/VietQRDisplay.js
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { formatCurrency } from '@/utils/format';

export default function VietQRDisplay({ order }) {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/settings?key=payment_config');
                const data = await res.json();
                if (data && data.value) {
                    setConfig(data.value);
                }
            } catch (error) {
                console.error('Failed to load payment config', error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    if (loading) return <div className="h-48 bg-gray-800 animate-pulse rounded-lg"></div>;
    if (!config || !config.bankId || !config.accountNo) return null;

    // Generate VietQR URL
    // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<INFO>&accountName=<NAME>
    const bankId = config.bankId;
    const accountNo = config.accountNo;
    const template = config.template || 'compact';

    // VietQR expects integers. Math.round is perfect for VND.
    const amount = Math.round(order.total_amount);

    const description = `ĐƠN HÀNG ${order.id}`;
    const accountName = config.accountName;

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

    return (
        <div className="mt-8 bg-white p-6 rounded-xl border-4 border-indigo-600/20 shadow-2xl max-w-md mx-auto text-center">
            <h3 className="text-gray-900 font-extrabold text-xl mb-2">Quét mã để thanh toán</h3>
            <p className="text-gray-500 text-sm mb-6">Sử dụng ứng dụng ngân hàng của bạn để quét mã QR này.</p>

            <div className="relative w-full aspect-square max-w-[300px] mx-auto mb-6">
                <Image
                    src={qrUrl}
                    alt="Mã Thanh Toán VietQR"
                    fill
                    className="object-contain"
                    unoptimized // VietQR generates dynamic images
                />
            </div>

            <div className="text-left bg-gray-100 p-4 rounded-lg text-sm space-y-2 text-gray-700">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="font-semibold">Ngân hàng:</span>
                    <span>{config.bankId}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="font-semibold">Số tài khoản:</span>
                    <span className="font-mono font-bold tracking-wider text-indigo-700">{config.accountNo}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="font-semibold">Tên tài khoản:</span>
                    <span className="uppercase">{config.accountName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="font-semibold">Số tiền:</span>
                    {/* REFACTORED: Use formatCurrency instead of toFixed(2) */}
                    <span className="font-bold text-red-600">{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold">Nội dung:</span>
                    <span className="font-mono text-gray-900">{description}</span>
                </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
                Trạng thái đơn hàng của bạn hiện đang là <strong>Chờ xử lý</strong>. Đơn hàng sẽ được xử lý sau khi thanh toán được xác nhận.
            </p>
        </div>
    );
}