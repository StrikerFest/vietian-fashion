'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';

export default function TagGenerationModal({ isOpen, onClose, selectedIds, onComplete }) {

    const { addToast } = useToast();

    const [scope, setScope] = useState('limit'); // 'limit', 'selected', 'all'

    const [limit, setLimit] = useState(10);

    const [targetAttributes, setTargetAttributes] = useState(['Màu sắc', 'Chất liệu', 'Phong cách']);

    const [newAttribute, setNewAttribute] = useState('');

        const [isProcessing, setIsProcessing] = useState(false);

        const [isComplete, setIsComplete] = useState(false);

        const [progressLog, setProgressLog] = useState([]);

        const [progress, setProgress] = useState({ current: 0, total: 0 });

    

        if (!isOpen) return null;

    

        const handleReset = () => {

            setIsComplete(false);

            setProgressLog([]);

            setIsProcessing(false);

            setProgress({ current: 0, total: 0 });

        };

    

        const handleAddAttribute = () => {

            if (newAttribute && !targetAttributes.includes(newAttribute)) {

                setTargetAttributes([...targetAttributes, newAttribute]);

                setNewAttribute('');

            }

        };

    

        const handleRemoveAttribute = (attr) => {

            setTargetAttributes(targetAttributes.filter(a => a !== attr));

        };

    

        const handleRun = async () => {

            if (isComplete) {

                onClose();

                return;

            }

            

            setIsProcessing(true);

            setIsComplete(false);

            setProgress({ current: 0, total: 0 });

            setProgressLog(['Đang khởi tạo...']);

    

            try {

                const response = await fetch('/api/admin/products/generate-tags-batch', {

                    method: 'POST',

                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({

                        scope,

                        limit: parseInt(limit),

                        ids: selectedIds,

                        targetAttributes

                    })

                });

    

                const reader = response.body.getReader();

                const decoder = new TextDecoder();

    

                while (true) {

                    const { value, done } = await reader.read();

                    if (done) break;

                    

                    const text = decoder.decode(value);

                    const lines = text.split('\n\n').filter(l => l.startsWith('data: '));

                    

                    for (const line of lines) {

                        const jsonStr = line.replace('data: ', '').trim();

                        if (!jsonStr) continue;

                        

                        try {

                            const data = JSON.parse(jsonStr);

                            if (data.status === 'start') {

                                setProgress({ current: 0, total: data.total });

                            }

                            if (data.log) {

                                setProgressLog(prev => [...prev.slice(-4), data.log]);

                                if (data.current !== null) {

                                    setProgress(prev => ({ ...prev, current: data.current }));

                                }

                            }

                            if (data.status === 'complete') {

                                setIsComplete(true);

                                setProgress(prev => ({ ...prev, current: prev.total }));

                                addToast(`Hoàn thành: Đã xử lý ${data.stats.processed}, Lỗi ${data.stats.errors}`, 'success');

                                if (onComplete) onComplete();

                            }

                            if (data.error) {

                                addToast(data.error, 'error');

                            }

                        } catch (e) {

                            console.error("Lỗi phân tích luồng", e);

                        }

                    }

                }

    

            } catch (error) {

                console.error(error);

                addToast("Không thể bắt đầu quá trình", "error");

            } finally {

                setIsProcessing(false);

            }

        };

    

        const progressPercentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    

        return (

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>

                <div className="bg-gray-800 rounded-lg w-full max-w-lg shadow-2xl border border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>

                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">

                        <h3 className="text-xl font-bold text-white flex items-center gap-2">

                            <span className="text-indigo-400">🏷️</span> Tự động gắn Thẻ AI

                        </h3>

                        <button onClick={onClose} disabled={isProcessing} className="text-gray-400 hover:text-white">&times;</button>

                    </div>

    

                    <div className="p-6 space-y-6">

                        {isComplete ? (

                            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">

                                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4 border border-green-500/50">

                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8">

                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />

                                    </svg>

                                </div>

                                <h4 className="text-xl font-bold text-white mb-2">Hoàn tất!</h4>

                                <p className="text-gray-400 text-sm mb-6">Đã cập nhật thẻ cho các sản phẩm.</p>

                                

                                <div className="bg-black/30 p-3 rounded border border-gray-700 font-mono text-xs text-gray-300 w-full max-h-32 overflow-y-auto text-left">

                                    {progressLog.map((log, i) => <div key={i}>{log}</div>)}

                                </div>

                            </div>

                        ) : (

                            <>

                                {/* Scope Selection */}

                                <div>

                                    <label className="block text-sm font-bold text-gray-300 mb-3">Phạm vi xử lý</label>

                                    <div className="space-y-2">

                                        <label className="flex items-center gap-3 cursor-pointer">

                                            <input 

                                                type="radio" 

                                                name="scope" 

                                                value="limit" 

                                                checked={scope === 'limit'} 

                                                onChange={e => setScope(e.target.value)}

                                                disabled={isProcessing}

                                                className="text-indigo-600 focus:ring-indigo-600 bg-gray-900 border-gray-600"

                                            />

                                            <span className="text-sm">Theo đợt (Bỏ qua SP đã có thẻ)</span>

                                        </label>

                                        

                                        {scope === 'limit' && (

                                            <div className="ml-7 flex items-center gap-2">

                                                <span className="text-xs text-gray-400">Số lượng:</span>

                                                <input 

                                                    type="number" 

                                                    value={limit} 

                                                    onChange={e => setLimit(e.target.value)}

                                                    className="w-20 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"

                                                    disabled={isProcessing}

                                                />

                                            </div>

                                        )}

    

                                        <label className="flex items-center gap-3 cursor-pointer">

                                            <input 

                                                type="radio" 

                                                name="scope" 

                                                value="selected" 

                                                checked={scope === 'selected'} 

                                                onChange={e => setScope(e.target.value)}

                                                disabled={isProcessing || selectedIds.length === 0}

                                                className="text-indigo-600 focus:ring-indigo-600 bg-gray-900 border-gray-600 disabled:opacity-50"

                                            />

                                            <span className={`text-sm ${selectedIds.length === 0 ? 'text-gray-600' : ''}`}>

                                                Các mục đã chọn ({selectedIds.length})

                                            </span>

                                        </label>

    

                                        <label className="flex items-center gap-3 cursor-pointer">

                                            <input 

                                                type="radio" 

                                                name="scope" 

                                                value="all" 

                                                checked={scope === 'all'} 

                                                onChange={e => setScope(e.target.value)}

                                                disabled={isProcessing}

                                                className="text-indigo-600 focus:ring-indigo-600 bg-gray-900 border-gray-600"

                                            />

                                            <span className="text-sm text-red-400 font-medium">Tất cả sản phẩm (Nặng)</span>

                                        </label>

                                    </div>

                                </div>

    

                                {/* Target Attributes */}

                                <div>

                                    <label className="block text-sm font-bold text-gray-300 mb-2">Thuộc tính mục tiêu</label>

                                    <p className="text-xs text-gray-500 mb-2">AI sẽ tập trung tạo các thẻ cho các nhóm này.</p>

                                    

                                    <div className="flex flex-wrap gap-2 mb-2">

                                        {targetAttributes.map(attr => (

                                            <span key={attr} className="bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded text-xs flex items-center gap-1">

                                                {attr}

                                                <button onClick={() => handleRemoveAttribute(attr)} disabled={isProcessing} className="hover:text-white ml-1">&times;</button>

                                            </span>

                                        ))}

                                    </div>

    

                                    <div className="flex gap-2">

                                        <input 

                                            type="text" 

                                            value={newAttribute}

                                            onChange={e => setNewAttribute(e.target.value)}

                                            onKeyDown={e => e.key === 'Enter' && handleAddAttribute()}

                                            placeholder="Thêm thuộc tính (VD: Quốc gia)..."

                                            className="flex-grow bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white"

                                            disabled={isProcessing}

                                        />

                                        <button 

                                            onClick={handleAddAttribute} 

                                            disabled={isProcessing}

                                            className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm font-bold"

                                        >

                                            Thêm

                                        </button>

                                    </div>

                                </div>

    

                                {/* Progress & Log */}

                                {isProcessing && (

                                    <div className="space-y-3">

                                        <div className="flex justify-between items-end text-xs mb-1">

                                            <span className="text-indigo-400 font-bold">Đang xử lý: {progress.current} / {progress.total}</span>

                                            <span className="text-gray-500">{progressPercentage}%</span>

                                        </div>

                                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden border border-gray-600">

                                            <div 

                                                className="bg-indigo-500 h-full transition-all duration-500 ease-out" 

                                                style={{ width: `${progressPercentage}%` }}

                                            ></div>

                                        </div>

                                        <div className="bg-black/50 p-3 rounded border border-gray-700 font-mono text-xs text-green-400 h-32 overflow-y-auto">

                                            {progressLog.map((log, i) => (

                                                <div key={i}>{log}</div>

                                            ))}

                                            {progressLog.length === 0 && <div>Đang chuẩn bị...</div>}

                                        </div>

                                    </div>

                                )}

                            </>

                        )}

                    </div>



                <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-3">

                    {!isComplete && (

                        <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 text-gray-400 hover:text-white font-bold text-sm">Hủy</button>

                    )}

                    

                    {isComplete ? (

                        <>

                            <button onClick={handleReset} className="px-4 py-2 text-gray-400 hover:text-white font-bold text-sm">Chạy lại</button>

                            <button 

                                onClick={onClose} 

                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold text-sm shadow-lg"

                            >

                                Đóng

                            </button>

                        </>

                    ) : (

                        <button 

                            onClick={handleRun} 

                            disabled={isProcessing}

                            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded font-bold text-sm shadow-lg flex items-center gap-2 disabled:opacity-50"

                        >

                            {isProcessing ? 'Đang xử lý...' : 'Bắt đầu tạo'}

                        </button>

                    )}

                </div>

            </div>

        </div>

    );}
