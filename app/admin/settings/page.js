'use client';

import { useState } from 'react';
import RecommendationSettings from '@/components/admin/settings/RecommendationSettings';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('recommendation');

    const tabs = [
        { id: 'general', label: 'General' },
        { id: 'recommendation', label: 'AI Recommendation' },
        { id: 'notifications', label: 'Notifications' },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">System Settings</h1>
            <p className="text-gray-400 mb-8">Manage store configuration and AI features.</p>

            {/* Tabs Header */}
            <div className="flex border-b border-gray-700 mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-3 text-sm font-medium transition-colors border-b-2 
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
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 min-h-[400px]">

                {activeTab === 'recommendation' && (
                    <RecommendationSettings />
                )}

                {activeTab === 'general' && (
                    <div className="text-center text-gray-500 py-12">
                        <p>General store settings (Currency, Timezone, etc.) would go here.</p>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="text-center text-gray-500 py-12">
                        <p>Notification preferences (Email providers, etc.) would go here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}