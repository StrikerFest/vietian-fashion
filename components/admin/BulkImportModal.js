// components/admin/BulkImportModal.js
'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/context/ToastContext';

export default function BulkImportModal({ isOpen, onClose, onComplete }) {
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ total: 0, completed: 0, successful: 0 });
    const [logs, setLogs] = useState([]); // To show specific "Created 'Blue Shirt'" messages

    if (!isOpen) return null;

    // 1. Handle File Selection
    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files);
        // Filter images only
        const validImages = selected.filter(file => file.type.startsWith('image/'));

        if (validImages.length !== selected.length) {
            addToast(`Skipped ${selected.length - validImages.length} non-image files.`, 'warning');
        }

        const newQueue = validImages.map(file => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            status: 'pending', // pending | processing | success | error
            result: null
        }));

        setFiles(prev => [...prev, ...newQueue]);
    };

    // 2. The Parallel Worker Engine
    const processQueue = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setLogs([]);
        setProgress({ total: files.length, completed: 0, successful: 0 });

        const CONCURRENT_LIMIT = 3; // Process 3 images at once
        const queue = [...files]; // Copy of state to mutate locally
        let activeWorkers = 0;
        let processedCount = 0;
        let successCount = 0;

        // Recursive worker function
        const next = async () => {
            if (queue.length === 0 && activeWorkers === 0) {
                // ALL DONE
                setIsProcessing(false);
                addToast(`Batch complete! ${successCount} products generated.`, 'success');
                if (onComplete) onComplete();
                return;
            }

            if (queue.length === 0) return; // No more tasks, just waiting for active ones

            // Grab next file
            const task = queue.shift();
            activeWorkers++;

            // Update UI to 'Processing'
            setFiles(prev => prev.map(f => f.id === task.id ? { ...f, status: 'processing' } : f));

            try {
                // --- API CALL ---
                const formData = new FormData();
                formData.append('image', task.file);

                const res = await fetch('/app/api/products/generate', {
                    method: 'POST',
                    body: formData,
                });

                const data = await res.json();

                if (!res.ok) throw new Error(data.error || 'Failed');

                // Success Logic
                successCount++;
                setLogs(prev => [`✅ Generated: ${data.product.name}`, ...prev]);
                setFiles(prev => prev.map(f => f.id === task.id ? { ...f, status: 'success' } : f));

            } catch (err) {
                console.error(err);
                setLogs(prev => [`❌ Failed: ${task.file.name} - ${err.message}`, ...prev]);
                setFiles(prev => prev.map(f => f.id === task.id ? { ...f, status: 'error' } : f));
            } finally {
                activeWorkers--;
                processedCount++;
                setProgress(prev => ({ ...prev, completed: processedCount, successful: successCount }));
                next(); // Trigger next task immediately
            }
        };

        // Start initial workers
        for (let i = 0; i < Math.min(CONCURRENT_LIMIT, files.length); i++) {
            next();
        }
    };

    const reset = () => {
        setFiles([]);
        setLogs([]);
        setProgress({ total: 0, completed: 0, successful: 0 });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-yellow-400">✨</span> AI Drop Generator
                        </h2>
                        <p className="text-sm text-gray-400">Upload images to auto-generate draft products.</p>
                    </div>
                    {!isProcessing && (
                        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* Dropzone Area */}
                    {!isProcessing && files.length === 0 && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-gray-800/50 rounded-xl p-12 text-center cursor-pointer transition-all group"
                        >
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📸</div>
                            <h3 className="text-lg font-medium text-white">Click or Drag images here</h3>
                            <p className="text-sm text-gray-500 mt-2">Supports JPG, PNG, WEBP</p>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                            />
                        </div>
                    )}

                    {/* Queue List */}
                    {files.length > 0 && (
                        <div className="space-y-4">
                            {/* Progress Bar */}
                            {isProcessing && (
                                <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-indigo-500 h-full transition-all duration-300"
                                        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                                    />
                                </div>
                            )}

                            {/* Status Logs (Mini Console) */}
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-xs text-gray-300 h-32 overflow-y-auto border border-gray-800">
                                {logs.length === 0 ? <span className="text-gray-600 opacity-50">Waiting to start...</span> : logs.map((log, i) => (
                                    <div key={i} className="mb-1">{log}</div>
                                ))}
                            </div>

                            {/* File Grid */}
                            <div className="grid grid-cols-4 gap-2 mt-4">
                                {files.map((fileObj) => (
                                    <div key={fileObj.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 group">
                                        <img
                                            src={URL.createObjectURL(fileObj.file)}
                                            className="w-full h-full object-cover opacity-60"
                                            alt="preview"
                                        />

                                        {/* Status Overlays */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            {fileObj.status === 'pending' && <span className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">Pending</span>}
                                            {fileObj.status === 'processing' && <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"/>}
                                            {fileObj.status === 'success' && <span className="text-xl">✅</span>}
                                            {fileObj.status === 'error' && <span className="text-xl">❌</span>}
                                        </div>
                                    </div>
                                ))}

                                {/* Add More Button */}
                                {!isProcessing && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-400"
                                    >
                                        + Add
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-between">
                    <button
                        onClick={reset}
                        disabled={isProcessing || files.length === 0}
                        className="text-sm text-gray-500 hover:text-white disabled:opacity-30"
                    >
                        Clear All
                    </button>

                    <button
                        onClick={processQueue}
                        disabled={isProcessing || files.length === 0}
                        className={`
                            px-6 py-2 rounded-lg font-bold text-white transition-all
                            ${isProcessing
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg hover:shadow-indigo-500/25'
                        }
                        `}
                    >
                        {isProcessing
                            ? `Generating (${progress.completed}/${progress.total})...`
                            : `Generate ${files.length} Products`
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}