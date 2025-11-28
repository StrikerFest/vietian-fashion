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
                addToast('Failed to load email settings', 'error');
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
                    description: 'Email sender configuration for system emails.'
                })
            });
            addToast('Email settings saved successfully', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to save settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-gray-400 animate-pulse">Loading configuration...</div>;

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4">Sender Identity</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Configure how automated emails (Order Confirmations, etc.) appear to your customers.
                    <br />
                    <span className="text-yellow-500/80">Note:</span> Ensure the <strong>Sender Email</strong> domain is verified in your email provider dashboard (e.g., Resend) to prevent delivery issues.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Sender Name</label>
                        <input
                            type="text"
                            value={config.senderName}
                            onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 transition-all"
                            placeholder="e.g. Vietian Fashion"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Sender Email</label>
                        <input
                            type="email"
                            value={config.senderEmail}
                            onChange={(e) => setConfig({ ...config, senderEmail: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-600 transition-all"
                            placeholder="e.g. orders@yourdomain.com"
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
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </form>
    );
}