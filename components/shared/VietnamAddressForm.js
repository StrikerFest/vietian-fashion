'use client';

import {useState, useEffect} from 'react';
import {useVietnamProvinces} from '@/hooks/useVietnamProvinces';

export default function VietnamAddressForm({onUpdate, initialData = {}}) {
    const {provinces, districts, wards, fetchDistricts, fetchWards, isLoading} = useVietnamProvinces();

    // Local state for selections (Codes are used for API, Names for DB)
    const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
    const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
    const [selectedWardCode, setSelectedWardCode] = useState('');
    const [detailAddress, setDetailAddress] = useState(initialData.address_line_1 || '');

    // Construct the payload for the parent component
    useEffect(() => {
        const provinceName = provinces.find(p => p.code == selectedProvinceCode)?.name || '';
        const districtName = districts.find(d => d.code == selectedDistrictCode)?.name || '';
        const wardName = wards.find(w => w.code == selectedWardCode)?.name || '';

        onUpdate({
            address_line_1: detailAddress,
            address_line_2: wardName, // Storing Ward here
            city: districtName,       // Storing District here
            state_province_region: provinceName, // Storing Province here
            postal_code: '70000',     // Hardcoded default
            country: 'Vietnam'        // Hardcoded default
        });
    }, [selectedProvinceCode, selectedDistrictCode, selectedWardCode, detailAddress, provinces, districts, wards, onUpdate]);

    // Handle Province Change
    const handleProvinceChange = (e) => {
        const code = e.target.value;
        setSelectedProvinceCode(code);
        setSelectedDistrictCode('');
        setSelectedWardCode('');
        fetchDistricts(code);
    };

    // Handle District Change
    const handleDistrictChange = (e) => {
        const code = e.target.value;
        setSelectedDistrictCode(code);
        setSelectedWardCode('');
        fetchWards(code);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Province */}
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">Tỉnh / Thành phố *</label>
                    <select
                        value={selectedProvinceCode}
                        onChange={handleProvinceChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-indigo-500"
                    >
                        <option value="">-- Chọn Tỉnh --</option>
                        {provinces.map(p => (
                            <option key={p.code} value={p.code}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* District */}
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">Quận / Huyện *</label>
                    <select
                        value={selectedDistrictCode}
                        onChange={handleDistrictChange}
                        disabled={!selectedProvinceCode}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <option value="">-- Chọn Quận --</option>
                        {districts.map(d => (
                            <option key={d.code} value={d.code}>{d.name}</option>
                        ))}
                    </select>
                </div>

                {/* Ward */}
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">Phường / Xã *</label>
                    <select
                        value={selectedWardCode}
                        onChange={(e) => setSelectedWardCode(e.target.value)}
                        disabled={!selectedDistrictCode}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <option value="">-- Chọn Phường --</option>
                        {wards.map(w => (
                            <option key={w.code} value={w.code}>{w.name}</option>
                        ))}
                    </select>
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

            {isLoading && <p className="text-xs text-indigo-400">Đang tải dữ liệu địa chính...</p>}
        </div>
    );
}