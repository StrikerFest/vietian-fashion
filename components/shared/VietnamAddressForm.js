// components/shared/VietnamAddressForm.js
'use client';

import {useState, useEffect} from 'react';

export default function VietnamAddressForm({onUpdate, initialData = {}}) {
    // Local state for manual inputs
    // We default to the initialData (useful for editing) or empty strings
    const [province, setProvince] = useState(initialData.state_province_region || '');
    const [district, setDistrict] = useState(initialData.city || '');
    const [ward, setWard] = useState(initialData.address_line_2 || '');
    const [detailAddress, setDetailAddress] = useState(initialData.address_line_1 || '');

    // Sync changes to Parent
    useEffect(() => {
        onUpdate({
            address_line_1: detailAddress,
            address_line_2: ward,        // Manual Ward input
            city: district,              // Manual District input
            state_province_region: province, // Manual Province input
            postal_code: '70000',        // Default (not strictly used in VN)
            country: 'Vietnam'           // Default
        });
    }, [province, district, ward, detailAddress, onUpdate]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Province (Manual Input) */}
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">Tỉnh / Thành phố *</label>
                    <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder="VD: TP. Hồ Chí Minh"
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-indigo-500"
                    />
                </div>

                {/* District (Manual Input) */}
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">Quận / Huyện *</label>
                    <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="VD: Quận 1"
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-indigo-500"
                    />
                </div>

                {/* Ward (Manual Input) */}
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">Phường / Xã *</label>
                    <input
                        type="text"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        placeholder="VD: Phường Bến Nghé"
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Detailed Address */}
            <div>
                <label className="block text-xs font-medium mb-1 text-gray-400">Địa chỉ cụ thể (Số nhà, đường) *</label>
                <input
                    type="text"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    placeholder="VD: 123 Đường Nguyễn Huệ"
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-indigo-500"
                />
            </div>
        </div>
    );
}