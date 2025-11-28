// components/cart/GuestAddressForm.js
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

const defaultAddress = {
    address_line_1: '',
    city: '',
    state_province_region: '',
    postal_code: '',
    country: '',
};

export default function GuestAddressForm({ onChange, setIsValid }) {
    const { addToast } = useToast();
    const [formData, setFormData] = useState(defaultAddress);

    const requiredFields = ['address_line_1', 'city', 'state_province_region', 'postal_code', 'country'];

    useEffect(() => {
        // Validation logic
        const allValid = requiredFields.every(field => formData[field]?.trim());
        setIsValid(allValid);
        onChange(formData);
    }, [formData, onChange, setIsValid]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-400">
                Please enter a shipping address to complete your guest order.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">Address Line 1*</label>
                    <input
                        type="text"
                        name="address_line_1"
                        value={formData.address_line_1}
                        onChange={handleChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">City*</label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">State/Region*</label>
                    <input
                        type="text"
                        name="state_province_region"
                        value={formData.state_province_region}
                        onChange={handleChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-400">Postal Code*</label>
                    <input
                        type="text"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium mb-1 text-gray-400">Country*</label>
                    <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                        required
                    />
                </div>
            </div>
        </div>
    );
}