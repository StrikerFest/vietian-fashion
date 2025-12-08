// app/admin/settings/page.js
'use client';

import { useState } from 'react';
import RecommendationSettings from '@/components/admin/settings/RecommendationSettings';
import HomepageSettings from '@/components/admin/settings/HomepageSettings';
import EmailSettings from '@/components/admin/settings/EmailSettings';
import TaxSettings from '@/components/admin/settings/TaxSettings';
import PaymentSettings from '@/components/admin/settings/PaymentSettings'; // --- NEW IMPORT ---

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('homepage');

    const tabs = [
        { id: 'homepage', label: 'Homepage Layout' },
        { id: 'recommendation', label: 'AI Recommendation' },
        { id: 'email', label: 'Email Config' },
        { id: 'tax', label: 'Tax & Shipping' },
        { id: 'payment', label: 'Payment (VietQR)' }, // --- NEW TAB ---
        { id: 'general', label: 'General' },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">System Settings</h1>
            <p className="text-gray-400 mb-8">Manage store configuration, layout, and system behaviors.</p>

            {/* Tabs Header */}
            <div className="flex border-b border-gray-700 mb-8 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap
                            ${activeTab === tab.id
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-6 min-h-[400px]">

                {activeTab === 'homepage' && (
                    <HomepageSettings />
                )}

                {activeTab === 'recommendation' && (
                    <RecommendationSettings />
                )}

                {activeTab === 'email' && (
                    <EmailSettings />
                )}

                {activeTab === 'tax' && (
                    <TaxSettings />
                )}

                {activeTab === 'payment' && ( // --- NEW TAB CONTENT ---
                    <PaymentSettings />
                )}

                {activeTab === 'general' && (
                    <div className="text-center text-gray-500 py-12">
                        <p>General store settings (Currency, Timezone, etc.) would go here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}