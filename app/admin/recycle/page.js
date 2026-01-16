'use client';

import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import PaginationControls from '@/components/ui/PaginationControls';

const ENTITY_TABS = [
    { id: 'products', label: 'Sản phẩm' },
    { id: 'categories', label: 'Danh mục' },
    { id: 'collections', label: 'Bộ sưu tập' },
    { id: 'discounts', label: 'Mã giảm giá' },
    { id: 'suppliers', label: 'Nhà cung cấp' },
    { id: 'users', label: 'Người dùng' },
    { id: 'reviews', label: 'Đánh giá' },
];

export default function RecycleBinPage() {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('products');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());
    
    // Pagination & Search
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Modal
    const [viewItem, setViewItem] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                entity: activeTab,
                page: page.toString(),
                limit: limit.toString(),
                search: search
            });
            const res = await fetch(`/api/admin/recycle?${params}`);
            const result = await res.json();
            
            if (!res.ok) throw new Error(result.error || 'Failed to fetch data');

            setData(result.data || []);
            setTotal(result.meta?.total || 0);
            setTotalPages(result.meta?.totalPages || 0);
            
            // Clear selection on page/tab change if needed, 
            // but keeping selection across pages is complex, simpler to clear.
            setSelectedIds(new Set()); 

        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page, limit, search]); // Re-fetch when these change

    // Reset pagination when tab changes
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setPage(1);
        setSearch('');
        setSelectedIds(new Set());
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(new Set(data.map(item => item.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id, checked) => {
        const next = new Set(selectedIds);
        if (checked) next.add(id);
        else next.delete(id);
        setSelectedIds(next);
    };

    const handleBulkAction = async (action, restoreMode = null) => {
        if (selectedIds.size === 0) return;
        
        let actionLabel = action === 'restore' ? 'khôi phục' : 'xóa vĩnh viễn';
        if (restoreMode) {
            const modeLabel = restoreMode === 'active' ? ' (Công khai/Hiện)' : ' (Nháp/Ẩn)';
            actionLabel += modeLabel;
        }

        if (!confirm(`Bạn có chắc chắn muốn ${actionLabel} ${selectedIds.size} mục đã chọn?`)) return;

        try {
            const res = await fetch('/api/admin/recycle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entity: activeTab,
                    ids: Array.from(selectedIds),
                    action,
                    restore_mode: restoreMode
                })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Action failed');

            addToast(result.message, 'success');
            fetchData(); // Refresh
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const hasStatusOption = ['products', 'categories', 'discounts', 'reviews'].includes(activeTab);

    const renderTableContent = () => {
        if (loading) return <tr><td colSpan="5" className="p-4 text-center text-gray-400">Đang tải...</td></tr>;
        if (data.length === 0) return <tr><td colSpan="5" className="p-4 text-center text-gray-400">Không có dữ liệu đã xóa.</td></tr>;

        return data.map(item => (
            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                <td className="p-4">
                    <input 
                        type="checkbox" 
                        className="rounded bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                    />
                </td>
                <td className="p-4 font-medium text-white">
                    {/* Dynamic Name Display */}
                    {item.name || item.title || item.code || item.email || (item.first_name ? `${item.first_name} ${item.last_name}` : 'N/A')}
                </td>
                <td className="p-4 text-gray-400 text-sm">
                    {/* Entity Specific Info */}
                    {activeTab === 'products' && (
                         <div className="flex items-center gap-2">
                            {item.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                            )}
                            <span>{item.sku || 'No SKU'}</span>
                         </div>
                    )}
                    {activeTab === 'categories' && <span className="px-2 py-1 rounded bg-gray-700 text-xs">{item.type}</span>}
                    {activeTab === 'discounts' && <span className="text-green-400">{item.value}%</span>}
                    {activeTab === 'reviews' && <span>{item.rating} ⭐ - {item.comment?.substring(0, 30)}...</span>}
                </td>
                <td className="p-4 text-gray-400 text-sm">
                    {new Date(item.deleted_at).toLocaleString('vi-VN')}
                </td>
                <td className="p-4 text-right">
                    <button 
                        onClick={() => setViewItem(item)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                        Xem chi tiết
                    </button>
                </td>
            </tr>
        ));
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Thùng rác (Recycle Bin)</h1>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-2">
                {ENTITY_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                            activeTab === tab.id 
                            ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-500' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {selectedIds.size > 0 && (
                        <>
                            <span className="text-sm text-gray-300 mr-2">{selectedIds.size} đã chọn</span>
                            
                            {hasStatusOption ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleBulkAction('restore', 'draft')}
                                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
                                    >
                                        ♻️ Khôi phục ({activeTab === 'products' ? 'Nháp' : 'Ẩn'})
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('restore', 'active')}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
                                    >
                                        ✅ Khôi phục ({activeTab === 'products' ? 'Công khai' : 'Hiện'})
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleBulkAction('restore')}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
                                >
                                    ♻️ Khôi phục
                                </button>
                            )}

                            <button
                                onClick={() => handleBulkAction('permanent_delete')}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm transition-colors ml-2"
                            >
                                🗑️ Xóa vĩnh viễn
                            </button>

                            {['products', 'categories'].includes(activeTab) && (
                                <button
                                    onClick={() => handleBulkAction('force_delete')}
                                    className="bg-red-800 hover:bg-red-900 text-white px-3 py-1.5 rounded text-sm transition-colors ml-2 border border-red-600"
                                    title="Xóa kèm theo các dữ liệu liên quan (Inventory, Links...)"
                                >
                                    💥 Xóa triệt để
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className="relative w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-750 border-b border-gray-700 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="p-4 w-12">
                                    <input 
                                        type="checkbox" 
                                        className="rounded bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500"
                                        checked={data.length > 0 && selectedIds.size === data.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </th>
                                <th className="p-4">Tên / Tiêu đề</th>
                                <th className="p-4">Thông tin thêm</th>
                                <th className="p-4">Ngày xóa</th>
                                <th className="p-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderTableContent()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {total > 0 && (
                <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    limit={limit}
                    onPageChange={setPage}
                    onLimitChange={setLimit}
                    isLoading={loading}
                />
            )}

            {/* Quick View Modal */}
            {viewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 p-6 animate-fade-in-up">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-white">Chi tiết mục đã xóa</h3>
                            <button onClick={() => setViewItem(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        
                        <div className="space-y-4 text-gray-300">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">ID</label>
                                <p className="font-mono text-sm">{viewItem.id}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Tên</label>
                                <p className="font-medium text-white">
                                    {viewItem.name || viewItem.title || viewItem.code || viewItem.email}
                                </p>
                            </div>
                             {viewItem.image_url && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold">Hình ảnh</label>
                                    <div className="mt-1">
                                         {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={viewItem.image_url} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-gray-700" />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Ngày xóa</label>
                                <p>{new Date(viewItem.deleted_at).toLocaleString('vi-VN')}</p>
                            </div>
                            
                            {/* Raw Data Dump for Debug/Deep Inspection */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Dữ liệu thô</label>
                                <pre className="mt-1 bg-gray-900 p-3 rounded text-xs text-green-400 overflow-x-auto max-h-32">
                                    {JSON.stringify(viewItem, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button 
                                onClick={() => setViewItem(null)}
                                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
