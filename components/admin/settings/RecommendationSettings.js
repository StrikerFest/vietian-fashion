// components/admin/settings/RecommendationSettings.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function RecommendationSettings() {
    const { addToast } = useToast();

    const [availableAttributes, setAvailableAttributes] = useState([]);
    const [selectedAttributes, setSelectedAttributes] = useState([]);

    const [limits, setLimits] = useState({
        products: 8,
        collections: 2,
        attributes: 2
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const catRes = await fetch('/api/categories?type=attribute');
                const allCategories = await catRes.json();
                const rootAttributes = allCategories.filter(c => !c.parent_id);
                setAvailableAttributes(rootAttributes);

                const [attrSettingRes, limitSettingRes] = await Promise.all([
                    fetch('/api/settings?key=ai_search_attributes'),
                    fetch('/api/settings?key=ai_search_limits')
                ]);

                const attrData = await attrSettingRes.json();
                if (attrData && attrData.value) {
                    setSelectedAttributes(attrData.value);
                }

                const limitData = await limitSettingRes.json();
                if (limitData && limitData.value) {
                    setLimits({
                        products: parseInt(limitData.value.products) || 8,
                        collections: parseInt(limitData.value.collections) || 2,
                        attributes: parseInt(limitData.value.attributes) || 2
                    });
                }

            } catch (error) {
                console.error("Failed to load settings:", error);
                addToast("Không thể tải cấu hình.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [addToast]);

    const handleToggleAttribute = (name) => {
        setSelectedAttributes(prev =>
            prev.includes(name)
                ? prev.filter(item => item !== name)
                : [...prev, name]
        );
    };

    const handleLimitChange = (key, value) => {
        const numValue = Math.max(0, parseInt(value) || 0);
        setLimits(prev => ({ ...prev, [key]: numValue }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const attrReq = fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'ai_search_attributes',
                    value: selectedAttributes,
                    description: 'Attributes displayed in the AI Search Modal inputs.'
                })
            });

            const limitReq = fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'ai_search_limits',
                    value: limits,
                    description: 'Max items to display in AI recommendation results.'
                })
            });

            await Promise.all([attrReq, limitReq]);

            addToast("Cập nhật cấu hình thành công!", "success");
        } catch (error) {
            console.error(error);
            addToast("Lưu cài đặt thất bại.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-gray-400 p-4 animate-pulse">Đang tải cấu hình...</div>;

    return (
        <div className="space-y-8">

            {/* Section 1: Attributes Selection */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
                <h3 className="text-lg font-medium text-white mb-2">Trường nhập liệu tìm kiếm AI</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Chọn các thuộc tính cụ thể mà khách hàng có thể xác định khi sử dụng Tìm kiếm AI {`(ví dụ: "Mùa", "Chất liệu")`}.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableAttributes.map((attr) => (
                        <label
                            key={attr.id}
                            className={`
                                flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200
                                ${selectedAttributes.includes(attr.name)
                                ? 'bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500/50'
                                : 'bg-gray-900/50 border-gray-600 hover:border-gray-500 hover:bg-gray-800'}
                            `}
                        >
                            <input
                                type="checkbox"
                                checked={selectedAttributes.includes(attr.name)}
                                onChange={() => handleToggleAttribute(attr.name)}
                                className="h-4 w-4 text-indigo-600 rounded border-gray-500 bg-gray-700 focus:ring-indigo-500 transition-colors"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-200 select-none">
                                {attr.name}
                            </span>
                        </label>
                    ))}
                </div>

                {availableAttributes.length === 0 && (
                    <div className="text-yellow-500 text-sm mt-2 bg-yellow-900/10 p-3 rounded border border-yellow-900/30">
                        Không tìm thấy thuộc tính nào. Hãy vào <strong>Danh mục</strong> và tạo danh mục mới với loại {`"Thuộc tính"`}.
                    </div>
                )}
            </div>

            {/* Section 2: Display Limits */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm">
                <h3 className="text-lg font-medium text-white mb-2">Giới hạn hiển thị kết quả</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Kiểm soát số lượng gợi ý tối đa được hiển thị cho khách hàng.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Product Limit */}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Số sản phẩm tối đa
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={limits.products}
                            onChange={(e) => handleLimitChange('products', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-2">Khuyên dùng: 4-12</p>
                    </div>

                    {/* Collection Limit */}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Số bộ sưu tập tối đa
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={limits.collections}
                            onChange={(e) => handleLimitChange('collections', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-2">Khuyên dùng: 1-2</p>
                    </div>

                    {/* Attribute Limit */}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Số danh mục tối đa
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={limits.attributes}
                            onChange={(e) => handleLimitChange('attributes', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-2">Khuyên dùng: 1-2</p>
                    </div>
                </div>
            </div>

            {/* Save Action */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isSaving ? 'Đang lưu cấu hình...' : 'Lưu tất cả cài đặt'}
                </button>
            </div>
        </div>
    );
}