// components/admin/settings/AiPromptSettings.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
    DEFAULT_PRODUCT_GENERATE_PROMPT,
    DEFAULT_TAGS_PROMPT,
    DEFAULT_DESCRIPTION_PROMPT
} from '@/utils/ai-prompts';

export default function AiPromptSettings() {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [prompts, setPrompts] = useState({
        product_generate: '',
        generate_tags: '',
        generate_description: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            // Fetch all 3 settings in parallel
            const [genRes, tagRes, descRes] = await Promise.all([
                fetch('/api/settings?key=prompt_product_generate'),
                fetch('/api/settings?key=prompt_generate_tags'),
                fetch('/api/settings?key=prompt_generate_description')
            ]);

            const genData = await genRes.json();
            const tagData = await tagRes.json();
            const descData = await descRes.json();

            setPrompts({
                product_generate: genData?.value?.value || DEFAULT_PRODUCT_GENERATE_PROMPT,
                generate_tags: tagData?.value?.value || DEFAULT_TAGS_PROMPT,
                generate_description: descData?.value?.value || DEFAULT_DESCRIPTION_PROMPT
            });
        } catch (error) {
            console.error(error);
            addToast('Không thể tải cấu hình Prompt.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (key, value, description) => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value, description }),
            });

            if (!response.ok) throw new Error('Lưu thất bại');
            addToast('Đã lưu cấu hình prompt thành công!', 'success');
        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = (key, defaultValue) => {
        if(!confirm('Bạn có chắc muốn khôi phục prompt này về mặc định?')) return;

        // Update local state
        const mapping = {
            'prompt_product_generate': 'product_generate',
            'prompt_generate_tags': 'generate_tags',
            'prompt_generate_description': 'generate_description'
        };

        setPrompts(prev => ({ ...prev, [mapping[key]]: defaultValue }));

        // Save to DB immediately to persist reset
        handleSave(key, defaultValue, 'AI Prompt Configuration');
    };

    if (isLoading) return <div className="text-gray-400">Đang tải cấu hình AI...</div>;

    return (
        <div className="space-y-12">
            {/* Section 1: Product Generation */}
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white">Tạo sản phẩm từ ảnh (Product Extraction)</h3>
                        <p className="text-sm text-gray-400">Dùng khi tải ảnh lên để tạo sản phẩm mới. Yêu cầu trả về JSON.</p>
                    </div>
                    <button
                        onClick={() => handleReset('prompt_product_generate', DEFAULT_PRODUCT_GENERATE_PROMPT)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                        Khôi phục mặc định
                    </button>
                </div>
                <textarea
                    value={prompts.product_generate}
                    onChange={(e) => setPrompts({ ...prompts, product_generate: e.target.value })}
                    className="w-full h-64 bg-gray-800 border border-gray-600 rounded p-3 text-sm font-mono text-gray-200 focus:ring-2 focus:ring-indigo-500 mb-2"
                />
                <div className="flex justify-end">
                    <button
                        onClick={() => handleSave('prompt_product_generate', prompts.product_generate, 'Prompt cho tính năng tạo sản phẩm từ ảnh')}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        Lưu Thay Đổi
                    </button>
                </div>
            </div>

            {/* Section 2: Tags Generation */}
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white">Gợi ý Thuộc tính (Auto Tags)</h3>
                        <p className="text-sm text-gray-400">
                            Dùng để điền các thuộc tính (Màu, Chất liệu...). <br/>
                            <span className="text-yellow-500">Biến số:</span> <code>{`{{productName}}`}</code>, <code>{`{{productDescription}}`}</code>, <code>{`{{attributeList}}`}</code>.
                        </p>
                    </div>
                    <button
                        onClick={() => handleReset('prompt_generate_tags', DEFAULT_TAGS_PROMPT)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                        Khôi phục mặc định
                    </button>
                </div>
                <textarea
                    value={prompts.generate_tags}
                    onChange={(e) => setPrompts({ ...prompts, generate_tags: e.target.value })}
                    className="w-full h-64 bg-gray-800 border border-gray-600 rounded p-3 text-sm font-mono text-gray-200 focus:ring-2 focus:ring-indigo-500 mb-2"
                />
                <div className="flex justify-end">
                    <button
                        onClick={() => handleSave('prompt_generate_tags', prompts.generate_tags, 'Prompt cho tính năng gợi ý tags')}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        Lưu Thay Đổi
                    </button>
                </div>
            </div>

            {/* Section 3: Description Generation */}
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-white">Viết mô tả (Copywriting)</h3>
                        <p className="text-sm text-gray-400">
                            Dùng để viết lại mô tả sản phẩm chuẩn SEO. <br/>
                            <span className="text-yellow-500">Biến số:</span> <code>{`{{productName}}`}</code>.
                        </p>
                    </div>
                    <button
                        onClick={() => handleReset('prompt_generate_description', DEFAULT_DESCRIPTION_PROMPT)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                        Khôi phục mặc định
                    </button>
                </div>
                <textarea
                    value={prompts.generate_description}
                    onChange={(e) => setPrompts({ ...prompts, generate_description: e.target.value })}
                    className="w-full h-48 bg-gray-800 border border-gray-600 rounded p-3 text-sm font-mono text-gray-200 focus:ring-2 focus:ring-indigo-500 mb-2"
                />
                <div className="flex justify-end">
                    <button
                        onClick={() => handleSave('prompt_generate_description', prompts.generate_description, 'Prompt cho tính năng viết mô tả')}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        Lưu Thay Đổi
                    </button>
                </div>
            </div>
        </div>
    );
}