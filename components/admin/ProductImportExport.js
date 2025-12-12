// components/admin/ProductImportExport.js
'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext'; // --- NEW ---

export default function ProductImportExport({ selectedProductIds, onImportSuccess }) {
    const { addToast } = useToast(); // --- NEW ---
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) return setMessage({ type: 'error', text: 'Vui lòng chọn tệp CSV.' });

        setIsImporting(true);
        setMessage({ type: '', text: '' });
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const response = await fetch('/api/products/bulk-import', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Nhập dữ liệu thất bại.');

            setMessage({
                type: 'success',
                text: `Thành công! Đã tạo ${data.created_products} sản phẩm, ${data.created_variants} biến thể.`
            });
            setImportFile(null);
            // Reset file input
            const fileInput = document.getElementById('importFile');
            if (fileInput) fileInput.value = null;

            if (onImportSuccess) onImportSuccess();
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsImporting(false);
        }
    };

    const handleExport = async (mode = 'all') => {
        if (mode === 'selected' && selectedProductIds.length === 0) {
            addToast('Vui lòng chọn sản phẩm để xuất.', 'info'); // --- FIXED: Replaced alert() ---
            return;
        }

        setIsExporting(true);
        let exportUrl = '/api/products/bulk-export';
        if (mode === 'selected') {
            const params = new URLSearchParams();
            params.append('ids', selectedProductIds.join(','));
            exportUrl = `${exportUrl}?${params.toString()}`;
        }

        try {
            const response = await fetch(exportUrl);
            if (!response.ok) throw new Error('Xuất dữ liệu thất bại.');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = mode === 'selected'
                ? `products_export_selected_${selectedProductIds.length}.csv`
                : 'products_export_all.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            addToast('Xuất thành công. Đang tải xuống.', 'success'); // --- NEW ---
        } catch (error) {
            addToast(error.message, 'error'); // --- FIXED: Replaced alert() ---
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Thao tác hàng loạt</h2>

            {/* Import Section */}
            <form onSubmit={handleImportSubmit} className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
                <div className="flex-grow">
                    <label htmlFor="importFile" className="block text-sm font-medium mb-1">Nhập CSV</label>
                    <input
                        type="file"
                        id="importFile"
                        accept=".csv, text/csv"
                        onChange={(e) => setImportFile(e.target.files[0])}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gray-700 file:text-white cursor-pointer"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isImporting || !importFile}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-md disabled:bg-gray-600 whitespace-nowrap"
                >
                    {isImporting ? 'Đang nhập...' : 'Tải lên & Nhập'}
                </button>
            </form>

            {message.text && (
                <div className={`mb-6 p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Export Section */}
            <div className="pt-4 border-t border-gray-700">
                <h3 className="text-sm font-semibold mb-3 text-gray-400">Công cụ xuất</h3>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => handleExport('selected')}
                        disabled={isExporting || selectedProductIds.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600"
                    >
                        {isExporting ? '...' : `Xuất đã chọn (${selectedProductIds.length})`}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExport('all')}
                        disabled={isExporting}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
                    >
                        Xuất tất cả
                    </button>
                </div>
            </div>
        </div>
    );
}