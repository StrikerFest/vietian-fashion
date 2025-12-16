// components/cart/GuestAddressForm.js
'use client';

import {useState, useEffect, useCallback} from 'react';
import VietnamAddressForm from '@/components/shared/VietnamAddressForm';

export default function GuestAddressForm({onChange, setIsValid}) {
    const [internalData, setInternalData] = useState({});

    const handleAddressUpdate = useCallback((data) => {
        setInternalData(data);

        // Validate required fields for Vietnam address
        // Note: postal_code and country are hardcoded in the child, so we check the user inputs
        const isValid =
            data.address_line_1?.trim() && // Street
            data.address_line_2?.trim() && // Ward
            data.city?.trim() &&           // District
            data.state_province_region?.trim(); // Province

        setIsValid(!!isValid);
        onChange(data);
    }, [onChange, setIsValid]);

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-400 border-b border-gray-700 pb-2 mb-4">
                Thông tin giao hàng (Chỉ hỗ trợ Việt Nam)
            </p>
            <VietnamAddressForm onUpdate={handleAddressUpdate}/>
        </div>
    );
}