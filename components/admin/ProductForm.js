// components/admin/ProductForm.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/context/ToastContext';

const emptyVariant = { sku: '', price: '', on_hand: '', attribute_value_ids: {} };

export default function ProductForm({ initialData, categories = [], collections = [], onSuccess, onCancel }) {
    const supabase = createClientComponentClient();
    const { addToast } = useToast();

    // --- State ---
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('draft'); // Added Status State
    const [imageFile, setImageFile] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [position, setPosition] = useState(0);
    const [selectedCatalogId, setSelectedCatalogId] = useState('');
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedAttributeIds, setSelectedAttributeIds] = useState(new Set());
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');

    const [variantConfig, setVariantConfig] = useState([]);
    const [variants, setVariants] = useState([{ ...emptyVariant }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Computed: AI Detection ---
    const isGenerated = useMemo(() => {
        return initialData?.name?.startsWith('[G]') || name.startsWith('[G]');
    }, [initialData, name]);

    // --- Dynamic Grouping of Attributes ---
    const attributeGroups = useMemo(() => {
        const groups = {};
        categories.filter(c => c.type === 'attribute' && !c.parent_id).forEach(root => {
            groups[root.id] = { ...root, options: [] };
        });
        categories.filter(c => c.type === 'attribute' && c.parent_id).forEach(opt => {
            if (groups[opt.parent_id]) {
                groups[opt.parent_id].options.push(opt);
            }
        });
        return Object.values(groups);
    }, [categories]);

    // --- Load Initial Data ---
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            setStatus(initialData.status || 'draft'); // Load Status
            setCurrentImageUrl(initialData.image_url || '');
            setPosition(initialData.position || 0);
            setSeoTitle(initialData.seo_title || '');
            setSeoDescription(initialData.seo_description || '');

            if (initialData.catalog_categories?.[0]) setSelectedCatalogId(initialData.catalog_categories[0].id);
            if (initialData.attributes) setSelectedAttributeIds(new Set(initialData.attributes.map(a => a.id)));
            if (initialData.collections) setSelectedCollectionIds(initialData.collections.map(c => c.id));

            if (initialData.product_variants?.length > 0) {
                const loadedVariants = initialData.product_variants.map(v => {
                    const attrMap = {};
                    if (v.attribute_value_ids) {
                        v.attribute_value_ids.forEach(optId => {
                            const group = attributeGroups.find(g => g.options.some(o => o.id === optId));
                            if (group) attrMap[group.id] = optId;
                        });
                    }
                    return {
                        ...v,
                        on_hand: v.inventory_levels?.[0]?.on_hand ?? 0,
                        attribute_value_ids: attrMap
                    };
                });
                setVariants(loadedVariants);

                // Auto-detect config from existing variants
                const detectedConfig = new Set();
                if (loadedVariants[0]) {
                    Object.keys(loadedVariants[0].attribute_value_ids).forEach(groupId => {
                        detectedConfig.add(parseInt(groupId));
                    });
                }
                setVariantConfig(Array.from(detectedConfig));
            }
        }
    }, [initialData, attributeGroups]);

    // --- Handlers ---
    const handleAttributeToggle = (id) => { const next = new Set(selectedAttributeIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedAttributeIds(next); };
    const handleCollectionToggle = (id) => { setSelectedCollectionIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]); };
    const handleVariantConfigToggle = (groupId) => { setVariantConfig(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]); };
    const handleVariantChange = (index, field, value) => { const updated = [...variants]; updated[index][field] = value; setVariants(updated); };
    const addVariant = () => setVariants([...variants, { ...emptyVariant }]);
    const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));

    const handleVariantAttributeChange = (index, groupId, optionId) => {
        const updated = [...variants];
        updated[index].attribute_value_ids = {
            ...updated[index].attribute_value_ids,
            [groupId]: parseInt(optionId)
        };
        setVariants(updated);
    };

    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error } = await supabase.storage.from('products').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let finalImageUrl = currentImageUrl;
            if (imageFile) finalImageUrl = await uploadImage(imageFile);

            // --- GRADUATION LOGIC ---
            // If publishing (Active) and still has [G] tag, strip it.
            let finalName = name;
            if (status === 'active' && finalName.startsWith('[G]')) {
                finalName = finalName.replace(/\[G\]\s?/, ''); // Remove '[G]' or '[G] '
            }

            const processedVariants = variants.map(v => {
                const attrIds = Object.values(v.attribute_value_ids).filter(id => id);
                return {
                    ...v,
                    price: parseFloat(v.price),
                    on_hand: parseInt(v.on_hand),
                    attribute_value_ids: attrIds
                };
            });

            const body = {
                name: finalName,
                description,
                status, // Send Status
                image_url: finalImageUrl,
                seo_title: seoTitle,
                seo_description: seoDescription,
                position: parseInt(position),
                variants: processedVariants,
                category_id: selectedCatalogId || null,
                attribute_ids: Array.from(selectedAttributeIds),
                collection_ids: selectedCollectionIds
            };

            const url = initialData ? `/api/products/${initialData.id}` : '/api/products';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Lưu sản phẩm thất bại');
            }

            // If we automatically renamed it, let the user know
            if (finalName !== name) {
                onSuccess(`Sản phẩm đã được xuất bản và thẻ "Generated" đã được xóa!`);
            } else {
                onSuccess(initialData ? 'Cập nhật sản phẩm thành công!' : 'Tạo sản phẩm thành công!');
            }

        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`bg-gray-800 p-6 rounded-lg transition-all ${
            isGenerated
                ? 'border-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                : 'border border-gray-700'
        }`}>

            {/* AI Banner */}
            {isGenerated && (
                <div className="bg-indigo-900/30 border border-indigo-500/50 text-indigo-200 px-4 py-3 rounded mb-6 flex items-start gap-3">
                    <span className="text-xl">✨</span>
                    <div>
                        <p className="font-bold text-sm">Bản nháp do AI tạo</p>
                        <p className="text-xs opacity-80">Sản phẩm này được tạo bởi Gemini. Vui lòng xem lại thẻ, danh mục và giá trước khi chuyển trạng thái sang <strong>Hoạt động</strong>.</p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {initialData ? 'Sửa sản phẩm' : 'Sản phẩm mới'}
                </h2>
                {/* Status Selector */}
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`
                        bg-gray-900 border text-sm rounded-lg block p-2.5 font-bold
                        ${status === 'active' ? 'border-green-500 text-green-400' : 'border-gray-600 text-gray-400'}
                    `}
                >
                    <option value="draft">Nháp</option>
                    <option value="active">Hoạt động (Đã xuất bản)</option>
                    <option value="archived">Lưu trữ</option>
                </select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tên sản phẩm</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white focus:border-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Vị trí (Ưu tiên)</label>
                            <input type="number" value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Mô tả</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white" rows="4" />
                        </div>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                        <label className="block text-sm text-gray-400 mb-2">Hình ảnh sản phẩm</label>
                        <input type="file" onChange={e => setImageFile(e.target.files[0])} className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700" />
                        {currentImageUrl && (
                            <div className="mt-4 relative h-48 w-full border border-gray-700 rounded overflow-hidden">
                                <Image src={currentImageUrl} alt="Preview" fill className="object-cover" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Taxonomy Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-700 pt-6">
                    <div>
                        <h3 className="font-semibold mb-2 text-blue-400">Điều hướng</h3>
                        <p className="text-xs text-gray-500 mb-2">Vị trí trong menu danh mục?</p>
                        <select value={selectedCatalogId} onChange={e => setSelectedCatalogId(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white">
                            <option value="">-- Chọn --</option>
                            {categories.filter(c => c.type === 'catalog').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-green-400">Bộ sưu tập</h3>
                        <p className="text-xs text-gray-500 mb-2">Nhóm tiếp thị (Mùa hè, Nổi bật...)</p>
                        <div className="max-h-40 overflow-y-auto bg-gray-700 p-2 rounded border border-gray-600">
                            {collections.map(c => (
                                <label key={c.id} className="flex gap-2 p-1 hover:bg-gray-600 rounded cursor-pointer">
                                    <input type="checkbox" checked={selectedCollectionIds.includes(c.id)} onChange={() => handleCollectionToggle(c.id)} className="rounded text-green-500 focus:ring-green-500 bg-gray-900 border-gray-500" />
                                    <span className="text-sm">{c.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-purple-400">Thuộc tính / Thẻ</h3>
                        <p className="text-xs text-gray-500 mb-2">Đặc điểm để lọc (Vintage, Cotton...)</p>
                        <div className="max-h-40 overflow-y-auto bg-gray-700 p-2 rounded border border-gray-600">
                            {attributeGroups.map(g => (
                                <div key={g.id} className="mb-2 last:mb-0">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 px-1">{g.name}</p>
                                    {g.options.map(o => (
                                        <label key={o.id} className="flex gap-2 pl-2 p-1 hover:bg-gray-600 rounded cursor-pointer">
                                            <input type="checkbox" checked={selectedAttributeIds.has(o.id)} onChange={() => handleAttributeToggle(o.id)} className="rounded text-purple-500 focus:ring-purple-500 bg-gray-900 border-gray-500" />
                                            <span className="text-sm">{o.name}</span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Variants Section */}
                <div className="border-t border-gray-700 pt-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">SKU & Giá cả</h3>
                    </div>

                    <div className="bg-indigo-900/20 p-4 rounded border border-indigo-500/30 mb-6">
                        <p className="text-sm text-indigo-300 mb-2 font-bold">Cấu hình tùy chọn biến thể</p>
                        <p className="text-xs text-gray-400 mb-3">Chọn các thuộc tính xác định biến thể của bạn (ví dụ: Kích thước, Màu sắc).</p>
                        <div className="flex flex-wrap gap-4">
                            {attributeGroups.map(group => (
                                <label key={group.id} className="flex items-center gap-2 cursor-pointer bg-gray-800 px-3 py-1.5 rounded border border-gray-600 hover:border-indigo-500 transition-colors">
                                    <input type="checkbox" checked={variantConfig.includes(group.id)} onChange={() => handleVariantConfigToggle(group.id)} className="text-indigo-500 rounded bg-gray-900 border-gray-500" />
                                    <span className="text-white text-sm">{group.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {variants.map((variant, index) => (
                            <div key={index} className="flex flex-wrap gap-3 items-end bg-gray-900/80 p-4 rounded border border-gray-700">
                                <div className="w-32">
                                    <label className="text-xs text-gray-500 mb-1 block">Mã SKU</label>
                                    <input type="text" value={variant.sku} onChange={e => handleVariantChange(index, 'sku', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm font-mono" required placeholder="SKU-001" />
                                </div>
                                {variantConfig.map(groupId => {
                                    const group = attributeGroups.find(g => g.id === groupId);
                                    return (
                                        <div key={groupId} className="w-32">
                                            <label className="text-xs text-gray-500 mb-1 block">{group?.name}</label>
                                            <select
                                                value={variant.attribute_value_ids[groupId] || ''}
                                                onChange={(e) => handleVariantAttributeChange(index, groupId, e.target.value)}
                                                className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm"
                                                required
                                            >
                                                <option value="">- Chọn -</option>
                                                {group?.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                            </select>
                                        </div>
                                    );
                                })}
                                <div className="w-28">
                                    <label className="text-xs text-gray-500 mb-1 block">Giá ($)</label>
                                    <input type="number" step="0.01" value={variant.price} onChange={e => handleVariantChange(index, 'price', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" required />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs text-gray-500 mb-1 block">Tồn kho</label>
                                    <input type="number" value={variant.on_hand} onChange={e => handleVariantChange(index, 'on_hand', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" required />
                                </div>
                                <button type="button" onClick={() => removeVariant(index)} disabled={variants.length <= 1} className="bg-red-900/50 hover:bg-red-900 text-red-200 rounded px-3 py-2 h-[38px] border border-red-800 transition-colors">×</button>
                            </div>
                        ))}
                        <button type="button" onClick={addVariant} className="text-sm text-green-400 hover:text-green-300 font-bold py-2 flex items-center gap-1">
                            <span>+</span> Thêm biến thể khác
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-700 sticky bottom-0 bg-gray-800 pb-2 z-10">
                    <button type="button" onClick={onCancel} className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors">Hủy</button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`
                            px-6 py-2 rounded font-bold text-white shadow-lg transition-all
                            ${isGenerated && status === 'active'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/30'
                            : 'bg-indigo-600 hover:bg-indigo-700'}
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        {isSubmitting ? 'Đang lưu...' : (
                            isGenerated && status === 'active' ? 'Xuất bản & Xóa [G]' : 'Lưu sản phẩm'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}