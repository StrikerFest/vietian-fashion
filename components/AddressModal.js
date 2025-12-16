// components/AddressModal.js
'use client';

import {useState, useCallback} from 'react';
import {useToast} from '@/context/ToastContext';
import VietnamAddressForm from '@/components/shared/VietnamAddressForm';

export default function AddressModal({isOpen, onClose, onAddressAdded}) {
    const {addToast} = useToast();
    const [formData, setFormData] = useState({});
    const [isDefault, setIsDefault] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // FIXED: Hook moved before the conditional return
    const handleAddressUpdate = useCallback((data) => {
        setFormData(data);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Manual validation
        if (!formData.address_line_1 || !formData.city || !formData.state_province_region) {
            addToast('Vui lòng chọn đầy đủ địa chỉ (Tỉnh, Huyện, Xã, Đường)', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {...formData, is_default: isDefault};

            const response = await fetch('/api/account/addresses', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Thêm địa chỉ thất bại');
            }

            addToast('Đã lưu địa chỉ mới thành công!', 'success');
            onAddressAdded();
            onClose();
        } catch (err) {
            addToast(`Lỗi: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // FIXED: Conditional return is now at the end of the logic block, ensuring hooks always run
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Thêm địa chỉ mới</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="p-6">
                    <VietnamAddressForm onUpdate={handleAddressUpdate}/>

                    <div className="flex items-center mt-6 p-3 bg-gray-900/50 rounded border border-gray-700">
                        <input
                            type="checkbox"
                            id="is_default"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                            className="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="is_default" className="ml-2 text-sm text-gray-300 cursor-pointer">
                            Đặt làm địa chỉ mặc định
                        </label>
                    </div>

                    <div className="pt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-600"
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu địa chỉ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}