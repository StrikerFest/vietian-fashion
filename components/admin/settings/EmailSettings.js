// components/admin/settings/EmailSettings.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function EmailSettings() {
    const { addToast } = useToast();
    const [config, setConfig] = useState({
        senderName: 'AI Fashion',
        senderEmail: 'orders@example.com'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings?key=email_config');
                const data = await res.json();
                if (data && data.value) {
                    setConfig(data.value);
                }
            } catch (error) {
                console.error(error);
                addToast('Không thể tải cài đặt email', 'error');
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
                    key: 'email_config',
                    value: config,
                    description: 'Cấu hình người gửi email cho hệ thống.'
                })
            });
            addToast('Đã lưu cài đặt email thành công', 'success');
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
                <h3 className="text-lg font-medium text-white mb-4">Danh tính người gửi</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Cấu hình cách email tự động (Xác nhận đơn hàng, v.v.) hiển thị với khách hàng của bạn.
                    <br />
                    <span className="text-yellow-500/80">Lưu ý:</span> Đảm bảo miền của <strong>Email người gửi</strong> đã được xác minh trong bảng điều khiển nhà cung cấp email (ví dụ: Resend) để tránh vấn đề gửi thư.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Tên người gửi</label>
                        <input
                            type="text"
                            value={config.senderName}
                            onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 transition-all"
                            placeholder="vd: Vietian Fashion"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Email người gửi</label>
                        <input
                            type="email"
                            value={config.senderEmail}
                            onChange={(e) => setConfig({ ...config, senderEmail: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 transition-all"
                            placeholder="vd: orders@yourdomain.com"
                            required
                        />
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