// components/admin/SupplierForm.js
'use client';

import { useState, useEffect } from 'react';

export default function SupplierForm({ initialData, onSuccess, onCancel }) {
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setContactPerson(initialData.contact_person || '');
            setEmail(initialData.email || '');
            setPhone(initialData.phone || '');
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const isEditing = !!initialData;
        const url = isEditing ? `/api/suppliers/${initialData.id}` : '/api/suppliers';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    contact_person: contactPerson || null,
                    email: email || null,
                    phone: phone || null
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Operation failed');
            }

            onSuccess(isEditing ? 'Supplier updated!' : 'Supplier created!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">{initialData ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">Supplier Name</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="contact" className="block text-sm font-medium mb-1">Contact Person</label>
                    <input
                        id="contact"
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
                    <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600"
                    >
                        {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Save')}
                    </button>
                    {initialData && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}