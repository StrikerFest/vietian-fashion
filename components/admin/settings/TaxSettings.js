// components/admin/settings/TaxSettings.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function TaxSettings() {
    const { addToast } = useToast();
    const [config, setConfig] = useState({
        taxRate: 0,
        shippingCost: 0,
        freeShippingThreshold: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings?key=tax_config');
                const data = await res.json();
                if (data && data.value) {
                    setConfig(data.value);
                }
            } catch (error) {
                console.error(error);
                addToast('Failed to load tax settings', 'error');
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
                    key: 'tax_config',
                    value: {
                        taxRate: parseFloat(config.taxRate),
                        shippingCost: parseFloat(config.shippingCost),
                        freeShippingThreshold: parseFloat(config.freeShippingThreshold)
                    },
                    description: 'Configuration for Tax Rate (%) and Shipping Cost ($).'
                })
            });
            addToast('Tax & Shipping settings saved successfully', 'success');
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
                <h3 className="text-lg font-medium text-white mb-4">Financial Settings</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Configure the base tax rate and shipping costs applied to all orders.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Tax Rate (%)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={config.taxRate}
                            onChange={(e) => setConfig({ ...config, taxRate: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="e.g. 5.0"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Applied to subtotal after discounts.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Standard Shipping ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={config.shippingCost}
                            onChange={(e) => setConfig({ ...config, shippingCost: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="e.g. 10.00"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Free Shipping Threshold ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={config.freeShippingThreshold}
                            onChange={(e) => setConfig({ ...config, freeShippingThreshold: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="e.g. 100"
                        />
                        <p className="text-xs text-gray-500 mt-1">Set to 0 to disable free shipping.</p>
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