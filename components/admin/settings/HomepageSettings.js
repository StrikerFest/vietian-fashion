// components/admin/settings/HomepageSettings.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function HomepageSettings() {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Data Sources
    const [collections, setCollections] = useState([]);
    const [categories, setCategories] = useState([]);

    // Config State
    const [config, setConfig] = useState({
        hero_banners: [],
        layout_order: [],
        sidebar: {
            enabled: false,
            position: 'left',
            widgets: [] // We will now populate this
        }
    });

    // --- Load Data (Same as before) ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settingsRes, colRes, catRes] = await Promise.all([
                    fetch('/api/settings?key=homepage_config'),
                    fetch('/api/collections?limit=100'),
                    fetch('/api/categories?type=catalog&mode=admin')
                ]);

                const settingsData = await settingsRes.json();
                setCollections((await colRes.json()).data || []);
                setCategories((await catRes.json()) || []);

                if (settingsData && settingsData.value) {
                    setConfig(prev => ({ ...prev, ...settingsData.value }));
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Hero & Layout Handlers (Hidden for brevity, same as Phase 2) ---
    const addBanner = () => setConfig(prev => ({ ...prev, hero_banners: [...prev.hero_banners, { id: Date.now(), image_url: '', title: '', link: '' }] }));
    const updateBanner = (i, f, v) => { const u = [...config.hero_banners]; u[i][f] = v; setConfig(prev => ({ ...prev, hero_banners: u })); };
    const removeBanner = (i) => { setConfig(prev => ({ ...prev, hero_banners: prev.hero_banners.filter((_, x) => x !== i) })); };

    const addRow = () => setConfig(prev => ({ ...prev, layout_order: [...prev.layout_order, { id: Date.now(), type: 'collection_row', target_id: '', title: '' }] }));
    const updateRow = (i, f, v) => { const u = [...config.layout_order]; u[i][f] = v; setConfig(prev => ({ ...prev, layout_order: u })); };
    const removeRow = (i) => setConfig(prev => ({ ...prev, layout_order: prev.layout_order.filter((_, x) => x !== i) }));
    const moveRow = (i, dir) => {
        const u = [...config.layout_order];
        if (dir === 'up' && i > 0) [u[i], u[i - 1]] = [u[i - 1], u[i]];
        else if (dir === 'down' && i < u.length - 1) [u[i], u[i + 1]] = [u[i + 1], u[i]];
        setConfig(prev => ({ ...prev, layout_order: u }));
    };

    // --- NEW: Widget Handlers ---
    const addWidget = (type) => {
        const newWidget = { id: Date.now(), type, title: '' };
        // Add specific fields based on type
        if (type === 'banner') { newWidget.image_url = ''; newWidget.link = ''; }
        if (type === 'html') { newWidget.content = '<div>Code here</div>'; }
        if (type === 'links') { newWidget.links = [{ label: 'Link 1', url: '/' }]; }

        setConfig(prev => ({
            ...prev,
            sidebar: {
                ...prev.sidebar,
                widgets: [...(prev.sidebar.widgets || []), newWidget]
            }
        }));
    };

    const updateWidget = (index, field, value) => {
        const updated = [...(config.sidebar.widgets || [])];
        updated[index][field] = value;
        setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, widgets: updated } }));
    };

    const removeWidget = (index) => {
        const updated = config.sidebar.widgets.filter((_, i) => i !== index);
        setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, widgets: updated } }));
    };

    const updateWidgetLink = (wIndex, lIndex, field, value) => {
        const widgets = [...config.sidebar.widgets];
        const links = [...widgets[wIndex].links];
        links[lIndex][field] = value;
        widgets[wIndex].links = links;
        setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, widgets } }));
    };

    const addWidgetLink = (wIndex) => {
        const widgets = [...config.sidebar.widgets];
        widgets[wIndex].links.push({ label: 'New Link', url: '/' });
        setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, widgets } }));
    };

    // --- Save Handler ---
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'homepage_config', value: config })
            });
            addToast("Settings saved!", "success");
        } catch (error) {
            addToast("Error saving", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="animate-pulse text-gray-400">Loading...</div>;

    return (
        <div className="space-y-12">
            {/* Hero Section (Simplified View for Context) */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between mb-4"><h3 className="text-lg font-bold text-white">Hero Banners</h3><button onClick={addBanner} className="text-xs bg-indigo-600 px-3 py-1 rounded">+ Add</button></div>
                {config.hero_banners.map((b, i) => (
                    <div key={b.id} className="mb-2 flex gap-2"><input value={b.image_url} onChange={e=>updateBanner(i,'image_url',e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full" placeholder="Image URL" /><button onClick={()=>removeBanner(i)} className="text-red-400">×</button></div>
                ))}
            </div>

            {/* Layout Section (Simplified View) */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between mb-4"><h3 className="text-lg font-bold text-white">Layout Rows</h3><button onClick={addRow} className="text-xs bg-green-600 px-3 py-1 rounded">+ Add Row</button></div>
                {config.layout_order.map((r, i) => (
                    <div key={r.id} className="mb-2 flex gap-2 items-center">
                        <button onClick={()=>moveRow(i,'up')}>▲</button><button onClick={()=>moveRow(i,'down')}>▼</button>
                        <select value={r.type} onChange={e=>updateRow(i,'type',e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"><option value="collection_row">Collection</option><option value="featured_grid">Featured</option></select>
                        <input value={r.title} onChange={e=>updateRow(i,'title',e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white flex-grow" placeholder="Title" />
                        <button onClick={()=>removeRow(i)} className="text-red-400 font-bold">×</button>
                    </div>
                ))}
            </div>

            {/* --- SIDEBAR CONFIGURATION --- */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Sidebar Configuration</h3>
                    <label className="flex items-center cursor-pointer">
                        <span className="mr-3 text-sm text-gray-300">Enable Sidebar</span>
                        <input type="checkbox" checked={config.sidebar.enabled} onChange={(e) => setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, enabled: e.target.checked } }))} className="accent-indigo-600 h-5 w-5" />
                    </label>
                </div>

                {config.sidebar.enabled && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Position</label>
                            <select value={config.sidebar.position} onChange={(e) => setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, position: e.target.value } }))} className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                                <option value="left">Left</option>
                                <option value="right">Right</option>
                            </select>
                        </div>

                        <div className="border-t border-gray-700 pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-md font-semibold text-gray-300">Widgets</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => addWidget('banner')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded border border-gray-600">+ Banner</button>
                                    <button onClick={() => addWidget('html')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded border border-gray-600">+ HTML/Ad</button>
                                    <button onClick={() => addWidget('links')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded border border-gray-600">+ Link List</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {(config.sidebar.widgets || []).map((widget, idx) => (
                                    <div key={widget.id} className="bg-gray-900/50 p-4 rounded border border-gray-600">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs font-bold uppercase text-indigo-400">{widget.type} Widget</span>
                                            <button onClick={() => removeWidget(idx)} className="text-red-400 hover:text-red-300">Remove</button>
                                        </div>

                                        {/* Common Title */}
                                        <div className="mb-2">
                                            <input value={widget.title} onChange={e => updateWidget(idx, 'title', e.target.value)} placeholder="Widget Title (Optional)" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white" />
                                        </div>

                                        {/* Banner Fields */}
                                        {widget.type === 'banner' && (
                                            <div className="space-y-2">
                                                <input value={widget.image_url} onChange={e => updateWidget(idx, 'image_url', e.target.value)} placeholder="Image URL" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white" />
                                                <input value={widget.link} onChange={e => updateWidget(idx, 'link', e.target.value)} placeholder="Target Link" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white" />
                                            </div>
                                        )}

                                        {/* HTML Fields */}
                                        {widget.type === 'html' && (
                                            <textarea value={widget.content} onChange={e => updateWidget(idx, 'content', e.target.value)} placeholder="<div>Embed Code</div>" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white font-mono h-24" />
                                        )}

                                        {/* Link List Fields */}
                                        {widget.type === 'links' && (
                                            <div>
                                                {widget.links?.map((link, lIdx) => (
                                                    <div key={lIdx} className="flex gap-2 mb-1">
                                                        <input value={link.label} onChange={e => updateWidgetLink(idx, lIdx, 'label', e.target.value)} placeholder="Label" className="w-1/2 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                                                        <input value={link.url} onChange={e => updateWidgetLink(idx, lIdx, 'url', e.target.value)} placeholder="URL" className="w-1/2 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                                                    </div>
                                                ))}
                                                <button onClick={() => addWidgetLink(idx)} className="text-xs text-indigo-400 underline mt-1">+ Add Link</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end pb-8">
                <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>
        </div>
    );
}