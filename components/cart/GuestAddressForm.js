// components/cart/GuestAddressForm.js
'use client';

import { useState, useCallback } from 'react';
import VietnamAddressForm from '@/components/shared/VietnamAddressForm';

export default function GuestAddressForm({ onChange, setIsValid }) {
    const [contactInfo, setContactInfo] = useState({
        email: '',
        phone: ''
    });
    const [addressData, setAddressData] = useState({});

    // Combined handler to update parent state
    const updateParent = useCallback((contact, address) => {
        const fullData = { ...address, ...contact };

        const isValid =
            address.address_line_1?.trim() &&
            address.address_line_2?.trim() &&
            address.city?.trim() &&
            address.state_province_region?.trim() &&
            contact.email?.trim() &&
            contact.phone?.trim();

        setIsValid(!!isValid);
        onChange(fullData);
    }, [onChange, setIsValid]);

    const handleContactChange = (e) => {
        const { name, value } = e.target;
        const newContact = { ...contactInfo, [name]: value };
        setContactInfo(newContact);
        updateParent(newContact, addressData);
    };

    const handleAddressUpdate = useCallback((data) => {
        setAddressData(data);
        updateParent(contactInfo, data);
    }, [contactInfo, updateParent]);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <p className="text-sm text-gray-400 border-b border-gray-700 pb-2">
                    Thông tin liên hệ
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-400">Email *</label>
                        <input
                            name="email"
                            type="email"
                            placeholder="email@example.com"
                            value={contactInfo.email}
                            onChange={handleContactChange}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-400">Số điện thoại *</label>
                        <input
                            name="phone"
                            type="tel"
                            placeholder="0901234567"
                            value={contactInfo.phone}
                            onChange={handleContactChange}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-sm text-gray-400 border-b border-gray-700 pb-2">
                    Địa chỉ giao hàng (Chỉ hỗ trợ Việt Nam)
                </p>
                <VietnamAddressForm onUpdate={handleAddressUpdate} />
            </div>
        </div>
    );
}