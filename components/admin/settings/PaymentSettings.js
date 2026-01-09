// components/admin/settings/PaymentSettings.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

import Image from 'next/image';

export default function PaymentSettings() {
    const { addToast } = useToast();
    const [config, setConfig] = useState({
        bankId: '',       // e.g. 'MB', 'VCB'
        accountNo: '',    // e.g. '9999999999'
        accountName: '',  // e.g. 'NGUYEN VAN A'
        template: 'compact' // 'compact', 'print', 'qr_only'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const commonBanks = [
        { code: 'MB', name: 'MB Bank' },
        { code: 'VCB', name: 'Vietcombank' },
        { code: 'TCB', name: 'Techcombank' },
        { code: 'ACB', name: 'ACB' },
        { code: 'VPB', name: 'VPBank' },
        { code: 'TPB', name: 'TPBank' },
        { code: 'ICB', name: 'VietinBank' },
        { code: 'BIDV', name: 'BIDV' },
    ];

    // --- Mock Data for Preview ---
    const mockOrderAmount = 100000;
    const mockOrderDescription = 'DON HANG MOCK-123';
    
    // Generate Preview URL
    const previewQrUrl = config.bankId && config.accountNo 
        ? `https://img.vietqr.io/image/${config.bankId}-${config.accountNo}-${config.template}.png?amount=${mockOrderAmount}&addInfo=${encodeURIComponent(mockOrderDescription)}&accountName=${encodeURIComponent(config.accountName)}`
        : null;

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings?key=payment_config');
                const data = await res.json();
                if (data && data.value) {
                    setConfig(data.value);
                }
            } catch (error) {
                console.error(error);
                addToast('Không thể tải cài đặt thanh toán', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [addToast]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'payment_config',
                    value: config,
                    description: 'Cấu hình chuyển khoản ngân hàng VietQR.'
                })
            });
            addToast('Đã lưu cài đặt thanh toán thành công', 'success');
        } catch (error) {
            console.error(error);
            addToast('Lưu cài đặt thất bại', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-gray-400 animate-pulse">Đang tải cấu hình...</div>;

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-medium text-white mb-4">Cấu hình VietQR</h3>
                    <p className="text-sm text-gray-400 mb-6">
                        Cấu hình tài khoản ngân hàng của bạn để nhận thanh toán. Mã QR sẽ được tạo tự động cho khách hàng trên trang xác nhận đơn hàng.
                    </p>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Ngân hàng</label>
                            <div className="relative">
                                <select
                                    value={config.bankId}
                                    onChange={(e) => setConfig({ ...config, bankId: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                    required
                                >
                                    <option value="">-- Chọn Ngân hàng --</option>
                                    {commonBanks.map(bank => (
                                        <option key={bank.code} value={bank.code}>{bank.name} ({bank.code})</option>
                                    ))}
                                    <option value="custom">Khác (Nhập thủ công)</option>
                                </select>
                            </div>
                        </div>

                        {!commonBanks.find(b => b.code === config.bankId) && config.bankId !== '' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Bank ID / ID</label>
                                <input
                                    type="text"
                                    value={config.bankId === 'custom' ? '' : config.bankId}
                                    onChange={(e) => setConfig({ ...config, bankId: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="vd: 970422"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Số tài khoản</label>
                            <input
                                type="text"
                                value={config.accountNo}
                                onChange={(e) => setConfig({ ...config, accountNo: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                placeholder="vd: 1903..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Tên tài khoản</label>
                            <input
                                type="text"
                                value={config.accountName}
                                onChange={(e) => setConfig({ ...config, accountName: e.target.value.toUpperCase() })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                placeholder="vd: NGUYEN VAN A"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Mẫu QR</label>
                            <select
                                value={config.template}
                                onChange={(e) => setConfig({ ...config, template: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="compact">Nhỏ gọn (Khuyên dùng)</option>
                                <option value="qr_only">Chỉ mã QR</option>
                                <option value="print">In ấn (Có khung)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                    </button>
                </div>
            </div>

            {/* --- PREVIEW SECTION --- */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Xem trước (Khách hàng sẽ thấy)</h3>
                <div className="bg-gray-100 rounded-xl p-6 border-4 border-indigo-500/30 text-center shadow-inner">
                    {previewQrUrl ? (
                        <>
                            <p className="text-gray-500 text-sm mb-4">Mô phỏng đơn hàng trị giá <strong>{mockOrderAmount.toLocaleString('vi-VN')} đ</strong></p>
                            <div className="relative w-full aspect-square max-w-[300px] mx-auto bg-white rounded-lg shadow-sm overflow-hidden mb-4">
                                <Image 
                                    src={previewQrUrl} 
                                    alt="VietQR Preview" 
                                    fill 
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                            <div className="text-left bg-white p-4 rounded border border-gray-200 text-sm space-y-2 shadow-sm text-gray-800">
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="font-semibold text-gray-600">Ngân hàng:</span>
                                    <span>{config.bankId}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="font-semibold text-gray-600">Số tài khoản:</span>
                                    <span className="font-mono font-bold text-indigo-700">{config.accountNo}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="font-semibold text-gray-600">Tên:</span>
                                    <span className="uppercase">{config.accountName || 'CHƯA NHẬP TÊN'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-semibold text-gray-600">Nội dung:</span>
                                    <span className="font-mono">{mockOrderDescription}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <span className="text-4xl mb-2">🏦</span>
                            <p>Vui lòng nhập thông tin ngân hàng để xem trước mã QR.</p>
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 italic text-center">
                    * Đây chỉ là hình ảnh xem trước. Mã QR thực tế sẽ thay đổi theo từng đơn hàng.
                </p>
            </div>
        </form>
    );
}