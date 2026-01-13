// components/admin/settings/HomepageSettings.js
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/context/ToastContext';

export default function HomepageSettings() {
    const supabase = createClientComponentClient();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingState, setUploadingState] = useState({ index: null, type: null }); // type: 'hero' or 'row'

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
            widgets: []
        }
    });

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

    // --- Helpers ---
    const handleUpload = async (type, index, file) => {
        if (!file) return;
        setUploadingState({ index, type });
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `banners/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);

            if (type === 'hero') {
                updateBanner(index, 'image_url', publicUrl);
            } else if (type === 'row') {
                updateRow(index, 'image_url', publicUrl);
            }
            addToast("Đã tải ảnh lên!", "success");
        } catch (error) {
            console.error(error);
            addToast("Lỗi tải ảnh: " + error.message, "error");
        } finally {
            setUploadingState({ index: null, type: null });
        }
    };

    // --- Hero Banner Logic ---
    const addBanner = () => setConfig(prev => ({ ...prev, hero_banners: [...prev.hero_banners, { id: Date.now(), image_url: '', title: '', link: '', buttons: [] }] }));
    const updateBanner = (i, f, v) => { const u = [...config.hero_banners]; u[i][f] = v; setConfig(prev => ({ ...prev, hero_banners: u })); };
    const removeBanner = (i) => { setConfig(prev => ({ ...prev, hero_banners: prev.hero_banners.filter((_, x) => x !== i) })); };

    // --- Layout Row Logic ---
    const addRow = () => setConfig(prev => ({ ...prev, layout_order: [...prev.layout_order, { id: Date.now(), type: 'collection_row', target_id: '', title: '' }] }));
    const updateRow = (i, f, v) => { const u = [...config.layout_order]; u[i][f] = v; setConfig(prev => ({ ...prev, layout_order: u })); };
    const removeRow = (i) => setConfig(prev => ({ ...prev, layout_order: prev.layout_order.filter((_, x) => x !== i) }));
    const moveRow = (i, dir) => {
        const u = [...config.layout_order];
        if (dir === 'up' && i > 0) [u[i], u[i - 1]] = [u[i - 1], u[i]];
        else if (dir === 'down' && i < u.length - 1) [u[i], u[i + 1]] = [u[i + 1], u[i]];
        setConfig(prev => ({ ...prev, layout_order: u }));
    };

    // --- Sidebar Logic ---
    const addWidget = (type) => { /* ... existing logic ... */
        const newWidget = { id: Date.now(), type, title: '' };
        if (type === 'banner') { newWidget.image_url = ''; newWidget.link = ''; }
        if (type === 'html') { newWidget.content = '<div>Code here</div>'; }
        if (type === 'links') { newWidget.links = [{ label: 'Link 1', url: '/' }]; }
        setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, widgets: [...(prev.sidebar.widgets || []), newWidget] } }));
    };
    const updateWidget = (index, field, value) => { /* ... */ 
        const updated = [...(config.sidebar.widgets || [])];
        updated[index][field] = value;
        setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, widgets: updated } }));
    };
    const removeWidget = (index) => { /* ... */
        const updated = config.sidebar.widgets.filter((_, i) => i !== index);
        setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, widgets: updated } }));
    };
    const updateWidgetLink = (wIndex, lIndex, field, value) => { /* ... */
        const widgets = [...config.sidebar.widgets];
        const links = [...widgets[wIndex].links];
        links[lIndex][field] = value;
        widgets[wIndex].links = links;
        setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, widgets } }));
    };
    const addWidgetLink = (wIndex) => { /* ... */
        const widgets = [...config.sidebar.widgets];
        widgets[wIndex].links.push({ label: 'New Link', url: '/' });
        setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, widgets } }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'homepage_config', value: config })
            });
            addToast("Đã lưu cài đặt!", "success");
        } catch (error) {
            addToast("Lỗi khi lưu", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Sub-component for managing buttons
    const ButtonManager = ({ buttons = [], onChange }) => {
        const addBtn = () => onChange([...buttons, { text: 'Button', link: '/', style: 'primary' }]);
        const updateBtn = (idx, field, val) => {
            const newBtns = [...buttons];
            newBtns[idx][field] = val;
            onChange(newBtns);
        };
        const removeBtn = (idx) => onChange(buttons.filter((_, i) => i !== idx));

        return (
            <div className="mt-2 p-2 bg-gray-900/50 rounded border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400 font-bold uppercase">Buttons</span>
                    <button onClick={addBtn} className="text-xs text-indigo-400 hover:text-indigo-300">+ Add Button</button>
                </div>
                {buttons.map((btn, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center">
                        <input value={btn.text} onChange={e => updateBtn(idx, 'text', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white w-24" placeholder="Text" />
                        <input value={btn.link} onChange={e => updateBtn(idx, 'link', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white flex-grow" placeholder="Link" />
                        <select value={btn.style} onChange={e => updateBtn(idx, 'style', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-1 py-1 text-xs text-white w-20">
                            <option value="primary">Primary</option>
                            <option value="outline">Outline</option>
                            <option value="white">White</option>
                        </select>
                        <button onClick={() => removeBtn(idx)} className="text-red-400 hover:text-red-300 text-xs px-1">×</button>
                    </div>
                ))}
            </div>
        );
    };

    if (isLoading) return <div className="animate-pulse text-gray-400">Đang tải...</div>;

    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between mb-4"><h3 className="text-lg font-bold text-white">Banner Chính (Hero)</h3><button onClick={addBanner} className="text-xs bg-indigo-600 px-3 py-1 rounded">+ Thêm</button></div>
                <div className="space-y-4">
                    {config.hero_banners.map((b, i) => (
                        <div key={b.id} className="p-4 border border-gray-600 rounded bg-gray-900/30 relative group">
                            <button onClick={()=>removeBanner(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-300 z-10 bg-gray-900 rounded-full w-6 h-6 flex items-center justify-center border border-gray-700">×</button>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Hình ảnh</label>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            value={b.image_url} 
                                            onChange={e=>updateBanner(i,'image_url',e.target.value)} 
                                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full" 
                                            placeholder="URL Hình ảnh" 
                                        />
                                        <label className={`cursor-pointer bg-gray-700 hover:bg-gray-600 border border-gray-600 px-3 py-1 rounded text-xs flex items-center whitespace-nowrap ${uploadingState.type === 'hero' && uploadingState.index === i ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {uploadingState.type === 'hero' && uploadingState.index === i ? '...' : 'Upload'}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => handleUpload('hero', i, e.target.files[0])}
                                            />
                                        </label>
                                    </div>
                                    {b.image_url && (
                                        <div className="relative h-32 w-full bg-gray-800 rounded overflow-hidden border border-gray-700">
                                            <img src={b.image_url} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Tiêu đề (Tùy chọn)</label>
                                        <input 
                                            value={b.title || ''} 
                                            onChange={e=>updateBanner(i,'title',e.target.value)} 
                                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full" 
                                            placeholder="Tiêu đề banner" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Liên kết toàn bộ (Tùy chọn)</label>
                                        <input 
                                            value={b.link || ''} 
                                            onChange={e=>updateBanner(i,'link',e.target.value)} 
                                            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white w-full" 
                                            placeholder="/collections/sale" 
                                        />
                                    </div>
                                    <ButtonManager 
                                        buttons={b.buttons} 
                                        onChange={(newBtns) => updateBanner(i, 'buttons', newBtns)} 
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Layout Section */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between mb-4"><h3 className="text-lg font-bold text-white">Các hàng bố cục</h3><button onClick={addRow} className="text-xs bg-green-600 px-3 py-1 rounded">+ Thêm hàng</button></div>
                {config.layout_order.map((r, i) => (
                    <div key={r.id} className="mb-4 bg-gray-900/40 p-3 rounded border border-gray-700">
                        <div className="flex gap-2 items-center mb-2">
                            <button onClick={()=>moveRow(i,'down')} className="text-gray-400 hover:text-white">▼</button>
                            <select value={r.type} onChange={e=>updateRow(i,'type',e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white w-32">
                                <option value="featured_grid">Nổi bật</option>
                                <option value="collection_row">Bộ sưu tập</option>
                                <option value="category_row">Danh mục</option>
                                <option value="banner_row">Banner Lớn</option>
                            </select>

                            <input 
                                type="text" 
                                value={r.title || ''} 
                                onChange={e=>updateRow(i,'title',e.target.value)} 
                                className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white flex-grow" 
                                placeholder="Tiêu đề phần (Header)" 
                            />
                            
                            <button onClick={()=>removeRow(i)} className="text-red-400 font-bold px-2">×</button>
                        </div>
                        
                        {/* Config based on Type */}
                        <div className="pl-6 border-l-2 border-gray-700 space-y-2">
                            {['featured_grid', 'collection_row', 'category_row'].includes(r.type) && (
                                <div className="flex items-center gap-4">
                                    <label className="text-xs text-gray-400">Số lượng:</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="50"
                                        value={r.limit || 8} 
                                        onChange={e=>updateRow(i,'limit',parseInt(e.target.value))} 
                                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white w-16 text-center" 
                                    />
                                </div>
                            )}

                            {(r.type === 'collection_row' || r.type === 'category_row') && (
                                <div className="flex items-center gap-4">
                                    <label className="text-xs text-gray-400">Nguồn dữ liệu:</label>
                                    <select value={r.target_id || ''} onChange={e=>updateRow(i,'target_id',e.target.value)} className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white flex-grow">
                                        <option value="">-- Chọn --</option>
                                        {r.type === 'collection_row' 
                                            ? collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                            : categories.filter(c => c.type === 'catalog').map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                        }
                                    </select>
                                </div>
                            )}

                            {r.type === 'banner_row' && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex gap-2">
                                        <input 
                                            value={r.image_url || ''} 
                                            onChange={e=>updateRow(i,'image_url',e.target.value)} 
                                            className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white flex-grow" 
                                            placeholder="URL Hình ảnh Banner" 
                                        />
                                        <label className={`cursor-pointer bg-gray-700 hover:bg-gray-600 border border-gray-600 px-3 py-1 rounded text-xs flex items-center whitespace-nowrap ${uploadingState.type === 'row' && uploadingState.index === i ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {uploadingState.type === 'row' && uploadingState.index === i ? '...' : 'Upload'}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => handleUpload('row', i, e.target.files[0])}
                                            />
                                        </label>
                                    </div>
                                    {r.image_url && (
                                        <img src={r.image_url} alt="Preview" className="h-24 w-auto rounded border border-gray-700 object-cover" />
                                    )}
                                    <ButtonManager 
                                        buttons={r.buttons} 
                                        onChange={(newBtns) => updateRow(i, 'buttons', newBtns)} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Sidebar Configuration */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Cấu hình Thanh bên</h3>
                    <label className="flex items-center cursor-pointer">
                        <span className="mr-3 text-sm text-gray-300">Bật Thanh bên</span>
                        <input type="checkbox" checked={config.sidebar.enabled} onChange={(e) => setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, enabled: e.target.checked } }))} className="accent-indigo-600 h-5 w-5" />
                    </label>
                </div>

                {config.sidebar.enabled && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Vị trí</label>
                            <select value={config.sidebar.position} onChange={(e) => setConfig(prev => ({ ...prev, sidebar: { ...prev.sidebar, position: e.target.value } }))} className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                                <option value="left">Trái</option>
                                <option value="right">Phải</option>
                            </select>
                        </div>

                        <div className="border-t border-gray-700 pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-md font-semibold text-gray-300">Tiện ích (Widgets)</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => addWidget('banner')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded border border-gray-600">+ Banner</button>
                                    <button onClick={() => addWidget('html')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded border border-gray-600">+ HTML/Ad</button>
                                    <button onClick={() => addWidget('links')} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded border border-gray-600">+ DS Liên kết</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {(config.sidebar.widgets || []).map((widget, idx) => (
                                    <div key={widget.id} className="bg-gray-900/50 p-4 rounded border border-gray-600">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs font-bold uppercase text-indigo-400">Tiện ích {widget.type}</span>
                                            <button onClick={() => removeWidget(idx)} className="text-red-400 hover:text-red-300">Xóa</button>
                                        </div>

                                        <div className="mb-2">
                                            <input value={widget.title} onChange={e => updateWidget(idx, 'title', e.target.value)} placeholder="Tiêu đề tiện ích (Tùy chọn)" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white" />
                                        </div>

                                        {widget.type === 'banner' && (
                                            <div className="space-y-2">
                                                <input value={widget.image_url} onChange={e => updateWidget(idx, 'image_url', e.target.value)} placeholder="URL Hình ảnh" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white" />
                                                <input value={widget.link} onChange={e => updateWidget(idx, 'link', e.target.value)} placeholder="Liên kết đích" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white" />
                                            </div>
                                        )}

                                        {widget.type === 'html' && (
                                            <textarea value={widget.content} onChange={e => updateWidget(idx, 'content', e.target.value)} placeholder="<div>Mã nhúng</div>" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white font-mono h-24" />
                                        )}

                                        {widget.type === 'links' && (
                                            <div>
                                                {widget.links?.map((link, lIdx) => (
                                                    <div key={lIdx} className="flex gap-2 mb-1">
                                                        <input value={link.label} onChange={e => updateWidgetLink(idx, lIdx, 'label', e.target.value)} placeholder="Nhãn" className="w-1/2 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                                                        <input value={link.url} onChange={e => updateWidgetLink(idx, lIdx, 'url', e.target.value)} placeholder="URL" className="w-1/2 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                                                    </div>
                                                ))}
                                                <button onClick={() => addWidgetLink(idx)} className="text-xs text-indigo-400 underline mt-1">+ Thêm liên kết</button>
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
                    {isSaving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}
                </button>
            </div>
        </div>
    );
}