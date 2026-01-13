// app/page.js
'use client';

import { useState, useEffect } from 'react';
import HeroCarousel from '@/components/home/HeroCarousel';
import HeroSection from '@/components/home/HeroSection';
import FeedSection from '@/components/home/FeedSection';
import Sidebar from '@/components/home/Sidebar';
import QuickViewModal from '@/components/QuickViewModal';

export default function HomePage() {
    const [config, setConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [quickViewProductId, setQuickViewProductId] = useState(null);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await fetch('/api/settings?key=homepage_config');
                const data = await res.json();
                if (data && data.value) {
                    setConfig(data.value);
                } else {
                    setConfig({
                        hero_banners: [],
                        layout_order: [
                            { id: 1, type: 'featured_grid', title: 'Xu hướng hiện nay', limit: 8 }
                        ],
                        sidebar: { enabled: false }
                    });
                }
            } catch (error) {
                console.error("Failed to load homepage config:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadConfig();
    }, []);

    if (isLoading) return <div className="min-h-screen bg-gray-900"></div>;

    return (
        <main className="min-h-screen bg-gray-900 text-white">
            <HeroCarousel banners={config?.hero_banners} />
            <HeroSection />

            <div className="max-w-7xl mx-auto py-12 px-4">
                <div className="flex flex-col lg:flex-row gap-8">

                    {config?.sidebar?.enabled && config.sidebar.position === 'left' && (
                        <Sidebar config={config.sidebar} />
                    )}

                    <div className="flex-grow min-w-0">
                        {/* Pass the handler to the feed */}
                        <FeedSection
                            layoutOrder={config?.layout_order}
                            onQuickView={setQuickViewProductId}
                        />
                    </div>

                    {config?.sidebar?.enabled && config.sidebar.position === 'right' && (
                        <Sidebar config={config.sidebar} />
                    )}
                </div>
            </div>

            {/* --- RESTORED MODAL --- */}
            <QuickViewModal
                productId={quickViewProductId}
                onClose={() => setQuickViewProductId(null)}
            />
        </main>
    );
}