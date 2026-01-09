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
    const [status, setStatus] = useState('draft');

    // [MODIFIED] Replaced single image state with array
    // Structure: { file: File|null, image_url: string, is_primary: boolean, id: number|null }
    const [productImages, setProductImages] = useState([]);

    const [position, setPosition] = useState(0);
    const [selectedCatalogId, setSelectedCatalogId] = useState('');
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);

    // REFACTORED: Store full tag objects instead of just IDs to handle "New" state
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagInputs, setTagInputs] = useState({});

    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');

    const [variantConfig, setVariantConfig] = useState([]);
    const [variants, setVariants] = useState([{ ...emptyVariant }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // AI Loading States
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);

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
            setStatus(initialData.status || 'draft');
            setPosition(initialData.position || 0);
            setSeoTitle(initialData.seo_title || '');
            setSeoDescription(initialData.seo_description || '');

            if (initialData.catalog_categories?.[0]) setSelectedCatalogId(initialData.catalog_categories[0].id);
            if (initialData.collections) setSelectedCollectionIds(initialData.collections.map(c => c.id));

            // [MODIFIED] Load Multiple Images
            if (initialData.product_images && initialData.product_images.length > 0) {
                setProductImages(initialData.product_images.map(img => ({
                    file: null,
                    image_url: img.image_url,
                    is_primary: img.is_primary,
                    id: img.id
                })));
            } else if (initialData.image_url) {
                // Fallback for legacy single image
                setProductImages([{
                    file: null,
                    image_url: initialData.image_url,
                    is_primary: true,
                    id: null
                }]);
            }

            if (initialData.attributes) {
                const loadedTags = initialData.attributes.map(attr => {
                    const categoryInfo = categories.find(c => c.id === attr.id);
                    return {
                        id: attr.id,
                        name: attr.name,
                        groupId: categoryInfo ? categoryInfo.parent_id : attr.parent_id,
                        isNew: false
                    };
                });
                setSelectedTags(loadedTags.filter(t => t.groupId));
            }

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

                const detectedConfig = new Set();
                if (loadedVariants[0]) {
                    Object.keys(loadedVariants[0].attribute_value_ids).forEach(groupId => {
                        detectedConfig.add(parseInt(groupId) || groupId);
                    });
                }
                setVariantConfig(Array.from(detectedConfig));
            }
        }
    }, [initialData, attributeGroups, categories]);;

    // --- Tag Management Logic ---
    const addTag = (tagName, group) => {
        const cleanName = tagName.trim();
        if (!cleanName) return;

        const isAlreadySelected = selectedTags.some(
            t => t.name.toLowerCase() === cleanName.toLowerCase() && t.groupId === group.id
        );
        if (isAlreadySelected) return;

        const existingOption = group.options.find(
            o => o.name.toLowerCase() === cleanName.toLowerCase()
        );

        const newTagObj = {
            id: existingOption ? existingOption.id : `NEW-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: existingOption ? existingOption.name : cleanName,
            groupId: group.id,
            isNew: !existingOption
        };

        setSelectedTags(prev => [...prev, newTagObj]);
    };

    const removeTag = (tagName, groupId) => {
        setSelectedTags(prev => prev.filter(t => !(t.name === tagName && t.groupId === groupId)));
    };

    const handleManualAddTag = (e, group) => {
        e.preventDefault();
        const val = tagInputs[group.id];
        if (val) {
            addTag(val, group);
            setTagInputs(prev => ({ ...prev, [group.id]: '' }));
        }
    };

    const handleKeyDown = (e, group) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleManualAddTag(e, group);
        }
    };

    // [MODIFIED] Update AI Image getter to use Primary Image from list
    const getImageForAI = async () => {
        const primaryImg = productImages.find(img => img.is_primary) || productImages[0];
        if (!primaryImg) return null;

        if (primaryImg.file) return primaryImg.file;

        if (primaryImg.image_url) {
            try {
                const response = await fetch(primaryImg.image_url);
                const blob = await response.blob();
                return new File([blob], "existing_image.jpg", { type: blob.type });
            } catch (err) {
                console.error("Could not fetch existing image for AI:", err);
                return null;
            }
        }
        return null;
    };

    // --- AI Handlers ---
    const handleGenerateDescription = async () => {
        if (!name) return addToast('Vui lòng nhập tên sản phẩm trước.', 'error');
        setIsGeneratingDesc(true);
        try {
            const fileToSend = await getImageForAI();
            if (!fileToSend) {
                addToast('Vui lòng tải ảnh lên để AI phân tích.', 'warning');
                setIsGeneratingDesc(false);
                return;
            }
            const formData = new FormData();
            formData.append('name', name);
            formData.append('image', fileToSend);

            const res = await fetch('/api/generate-description', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            if (data.description) setDescription(data.description);
            addToast('Đã tạo mô tả từ AI!', 'success');
        } catch (error) {
            addToast('Lỗi tạo mô tả: ' + error.message, 'error');
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleGenerateTags = async () => {
        if (!name) return addToast('Vui lòng nhập tên sản phẩm trước.', 'error');
        setIsGeneratingTags(true);
        try {
            const fileToSend = await getImageForAI();
            if (!fileToSend) {
                addToast('Vui lòng tải ảnh lên để AI phân tích.', 'warning');
                setIsGeneratingTags(false);
                return;
            }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            formData.append('image', fileToSend);

            const res = await fetch('/api/generate-tags', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();

            if (result.data) {
                const suggestedTags = result.data;
                let count = 0;

                Object.keys(suggestedTags).forEach(groupName => {
                    const group = attributeGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
                    if (group && Array.isArray(suggestedTags[groupName])) {
                        suggestedTags[groupName].forEach(val => {
                            addTag(val, group);
                            count++;
                        });
                    }
                });
                addToast(`AI đã đề xuất ${count} thẻ!`, 'success');
            }
        } catch (error) {
            addToast('Lỗi tạo thẻ: ' + error.message, 'error');
        } finally {
            setIsGeneratingTags(false);
        }
    };

    // --- Other Handlers ---
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
        return { publicUrl: data.publicUrl, path: fileName };
    };

    // [MODIFIED] New Image Handlers
    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newImages = files.map(file => ({
            file,
            image_url: URL.createObjectURL(file),
            is_primary: productImages.length === 0,
            id: null
        }));

        setProductImages(prev => {
            const hasPrimary = prev.some(img => img.is_primary);
            if (!hasPrimary && newImages.length > 0) newImages[0].is_primary = true;
            return [...prev, ...newImages];
        });
    };

    const removeImage = (index) => {
        setProductImages(prev => {
            const newStats = prev.filter((_, i) => i !== index);
            if (prev[index].is_primary && newStats.length > 0) {
                newStats[0].is_primary = true;
            }
            return newStats;
        });
    };

    const setPrimaryImage = (index) => {
        setProductImages(prev => prev.map((img, i) => ({
            ...img,
            is_primary: i === index
        })));
    };

    // --- SUBMIT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // --- SKU Validation ---
        const skuCounts = {};
        let hasDuplicateSku = false;

        for (const variant of variants) {
            const sku = variant.sku ? variant.sku.trim() : '';
            if (!sku) {
                addToast('Vui lòng nhập SKU cho tất cả biến thể.', 'error');
                setIsSubmitting(false);
                return;
            }
            if (skuCounts[sku]) {
                hasDuplicateSku = true;
                break;
            }
            skuCounts[sku] = (skuCounts[sku] || 0) + 1;
        }

        if (hasDuplicateSku) {
            addToast('Có SKU bị trùng lặp trong danh sách biến thể. Vui lòng kiểm tra lại.', 'error');
            setIsSubmitting(false);
            return;
        }
        // -------------------------------------

        const uploadedPaths = [];

        try {
            // 1. Handle "New" Tags Creation
            const newTags = selectedTags.filter(t => t.isNew);
            const existingTagIds = selectedTags.filter(t => !t.isNew).map(t => t.id);
            const tempIdToRealIdMap = {};
            const createdTagIds = [];

            if (newTags.length > 0) {
                await Promise.all(newTags.map(async (tag) => {
                    const res = await fetch('/api/categories', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: tag.name,
                            type: 'attribute',
                            parent_id: tag.groupId,
                            is_active: true
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        createdTagIds.push(data.id);
                        tempIdToRealIdMap[tag.id] = data.id; // Map TEMP ID to REAL ID
                    }
                }));
            }

            const finalAttributeIds = [...existingTagIds, ...createdTagIds];

            // [MODIFIED] 2. Upload Images with Cleanup Tracking
            const finalImages = await Promise.all(productImages.map(async (img) => {
                if (img.file) {
                    try {
                        const { publicUrl, path } = await uploadImage(img.file);
                        uploadedPaths.push(path);
                        return { ...img, image_url: publicUrl };
                    } catch (err) {
                        throw new Error(`Lỗi tải ảnh "${img.file.name}": ${err.message}`);
                    }
                }
                return img;
            }));

            const primaryImage = finalImages.find(img => img.is_primary) || finalImages[0];
            const primaryImageUrl = primaryImage ? primaryImage.image_url : null;

            // 3. Name Formatting
            let finalName = name;
            if (status === 'active' && finalName.startsWith('[G]')) {
                finalName = finalName.replace(/\[G\]\s?/, '');
            }

            // 4. Variant Formatting
            const processedVariants = variants.map(v => {
                // Replace Temp IDs with Real IDs in attribute_value_ids
                const processedAttrIds = {};
                Object.entries(v.attribute_value_ids).forEach(([groupId, valId]) => {
                    if (valId && valId.toString().startsWith('NEW-')) {
                         if (tempIdToRealIdMap[valId]) {
                             processedAttrIds[groupId] = tempIdToRealIdMap[valId];
                         }
                         // If map failed, we drop it to avoid foreign key error
                    } else {
                        processedAttrIds[groupId] = valId;
                    }
                });

                const attrIds = Object.values(processedAttrIds).filter(id => id);
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
                status,
                image_url: primaryImageUrl, // Legacy / Main
                images: finalImages.map(img => ({
                    image_url: img.image_url,
                    is_primary: img.is_primary,
                    alt_text: name
                })),
                seo_title: seoTitle,
                seo_description: seoDescription,
                position: parseInt(position),
                variants: processedVariants,
                category_id: selectedCatalogId || null,
                attribute_ids: finalAttributeIds,
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

            if (finalName !== name) {
                onSuccess(`Sản phẩm đã được xuất bản và thẻ "Generated" đã được xóa!`);
            } else {
                onSuccess(initialData ? 'Cập nhật sản phẩm thành công!' : 'Tạo sản phẩm thành công!');
            }

        } catch (error) {
            // [CLEANUP] Delete uploaded images if submission fails
            if (uploadedPaths.length > 0) {
                await supabase.storage.from('products').remove(uploadedPaths);
                console.warn('Cleaned up orphaned images:', uploadedPaths);
            }
            addToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`bg-gray-800 p-6 rounded-lg transition-all ${isGenerated ? 'border-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'border border-gray-700'}`}>

            {isGenerated && (
                <div className="bg-indigo-900/30 border border-indigo-500/50 text-indigo-200 px-4 py-3 rounded mb-6 flex items-start gap-3">
                    <span className="text-xl">✨</span>
                    <div>
                        <p className="font-bold text-sm">Bản nháp do AI tạo</p>
                        <p className="text-xs opacity-80">Vui lòng kiểm tra lại trước khi xuất bản.</p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {initialData ? 'Sửa sản phẩm' : 'Sản phẩm mới'}
                </h2>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`bg-gray-900 border text-sm rounded-lg block p-2.5 font-bold ${status === 'active' ? 'border-green-500 text-green-400' : 'border-gray-600 text-gray-400'}`}
                >
                    <option value="draft">Nháp</option>
                    <option value="active">Hoạt động (Đã xuất bản)</option>
                    <option value="archived">Lưu trữ</option>
                </select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tên sản phẩm</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white focus:border-indigo-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Vị trí (Ưu tiên)</label>
                            <input type="number" value={position} onChange={e => setPosition(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white" />
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="block text-sm text-gray-400">Mô tả</label>
                                <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDesc} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50">
                                    {isGeneratingDesc ? 'Creating...' : '✨ Auto-Write'}
                                </button>
                            </div>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white" rows="4" />
                        </div>
                    </div>

                    {/* [MODIFIED] New Image Upload Section */}
                    <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                        <label className="block text-sm text-gray-400 mb-2">Hình ảnh sản phẩm (Nhiều ảnh)</label>
                        <input
                            type="file"
                            multiple
                            onChange={handleImageUpload}
                            className="w-full text-sm text-gray-300 mb-4"
                            accept="image/*"
                        />

                        <div className="grid grid-cols-3 gap-3">
                            {productImages.map((img, idx) => (
                                <div key={idx} className={`relative group border-2 rounded overflow-hidden h-24 ${img.is_primary ? 'border-indigo-500' : 'border-gray-600'}`}>
                                    <Image src={img.image_url} alt="preview" fill className="object-cover" />

                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                        {!img.is_primary && (
                                            <button
                                                type="button"
                                                onClick={() => setPrimaryImage(idx)}
                                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded"
                                            >
                                                Đặt chính
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                                        >
                                            Xóa
                                        </button>
                                    </div>

                                    {img.is_primary && (
                                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] px-1">Chính</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Taxonomy Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-700 pt-6">
                    <div>
                        <h3 className="font-semibold mb-2 text-blue-400">Điều hướng</h3>
                        <p className="text-xs text-gray-500 mb-2">Menu danh mục chính</p>
                        <select value={selectedCatalogId} onChange={e => setSelectedCatalogId(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white">
                            <option value="">-- Chọn --</option>
                            {categories.filter(c => c.type === 'catalog').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-green-400">Bộ sưu tập</h3>
                        <p className="text-xs text-gray-500 mb-2">Nhóm tiếp thị</p>
                        <div className="max-h-40 overflow-y-auto bg-gray-700 p-2 rounded border border-gray-600">
                            {collections.map(c => (
                                <label key={c.id} className="flex gap-2 p-1 hover:bg-gray-600 rounded cursor-pointer">
                                    <input type="checkbox" checked={selectedCollectionIds.includes(c.id)} onChange={() => handleCollectionToggle(c.id)} className="rounded text-green-500 focus:ring-green-500 bg-gray-900 border-gray-500" />
                                    <span className="text-sm">{c.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Attribute/Tag Section */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-purple-400">Thuộc tính / Thẻ</h3>
                            <button
                                type="button"
                                onClick={handleGenerateTags}
                                disabled={isGeneratingTags}
                                className="text-[10px] bg-purple-900/50 hover:bg-purple-900 text-purple-200 px-2 py-1 rounded border border-purple-500/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                                {isGeneratingTags ? '...' : '✨ Suggest'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Nhập thủ công hoặc dùng AI gợi ý.</p>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                            {attributeGroups.map(group => (
                                <div key={group.id} className="bg-gray-700/50 p-3 rounded border border-gray-700">
                                    <p className="text-xs text-gray-300 font-bold uppercase tracking-wider mb-2">{group.name}</p>

                                    {/* Selected Tags List (Pills) */}
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedTags.filter(t => t.groupId === group.id).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className={`
                                                    inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border
                                                    ${tag.isNew
                                                    ? 'bg-green-900/30 border-green-500 text-green-300'
                                                    : 'bg-purple-900/30 border-purple-500/50 text-purple-200'}
                                                `}
                                            >
                                                {tag.name}
                                                {tag.isNew && <span className="text-[9px] bg-green-600 text-white px-1 rounded ml-1">Mới</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag.name, group.id)}
                                                    className="ml-1 hover:text-white"
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                        {selectedTags.filter(t => t.groupId === group.id).length === 0 && (
                                            <span className="text-xs text-gray-500 italic">Chưa chọn</span>
                                        )}
                                    </div>

                                    {/* Manual Input */}
                                    <div className="flex gap-1">
                                        <input
                                            type="text"
                                            placeholder={`+ Thêm ${group.name.toLowerCase()}...`}
                                            value={tagInputs[group.id] || ''}
                                            onChange={(e) => setTagInputs(prev => ({...prev, [group.id]: e.target.value}))}
                                            onKeyDown={(e) => handleKeyDown(e, group)}
                                            className="flex-1 bg-gray-800 text-xs text-white px-2 py-1 rounded border border-gray-600 focus:border-indigo-500 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => handleManualAddTag(e, group)}
                                            className="bg-gray-600 hover:bg-gray-500 text-white px-2 rounded text-xs"
                                        >
                                            Add
                                        </button>
                                    </div>
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
                                    <input
                                        type="text"
                                        value={variant.sku}
                                        onChange={e => handleVariantChange(index, 'sku', e.target.value)}
                                        className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm font-mono"
                                        required
                                        placeholder="SKU-001"
                                    />
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
                                                {selectedTags.filter(t => t.groupId === groupId && t.isNew).map((t, i) => (
                                                    <option key={`new-${i}`} value={t.id}>✨ {t.name} (Mới)</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                                <div className="w-28">
                                    <label className="text-xs text-gray-500 mb-1 block">Giá (₫)</label>
                                    <input type="number" step="1" value={variant.price} onChange={e => handleVariantChange(index, 'price', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" required />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs text-gray-500 mb-1 block">Tồn kho</label>
                                    <input type="number" value={variant?.inventory_levels?.on_hand || 0} onChange={e => handleVariantChange(index, 'on_hand', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 text-white text-sm" required />
                                </div>
                                <button type="button" onClick={() => removeVariant(index)} disabled={variants.length <= 1} className="bg-red-900/50 hover:bg-red-900 text-red-200 rounded px-3 py-2 h-[38px] border border-red-800 transition-colors">×</button>
                            </div>
                        ))}
                        <button type="button" onClick={addVariant} className="text-sm text-green-400 hover:text-green-300 font-bold py-2 flex items-center gap-1">
                            <span>+</span> Thêm biến thể khác
                        </button>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4 pt-6 border-t border-gray-700 sticky bottom-0 bg-gray-800 pb-2 z-10">
                    <button type="button" onClick={onCancel} className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors">Hủy</button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`
                            px-6 py-2 rounded font-bold text-white shadow-lg transition-all
                            ${isGenerated && status === 'active' ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-indigo-600 hover:bg-indigo-700'}
                            disabled:opacity-50
                        `}
                    >
                        {isSubmitting ? 'Đang lưu...' : (isGenerated && status === 'active' ? 'Xuất bản & Xóa [G]' : 'Lưu sản phẩm')}
                    </button>
                </div>
            </form>
        </div>
    );
}