// components/admin/settings/PaymentSettings.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

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
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
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
        </form>
    );
}