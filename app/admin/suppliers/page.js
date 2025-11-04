// app/admin/suppliers/page.js
'use client';

import { useState, useEffect } from 'react';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingSupplier, setEditingSupplier] = useState(null);

    // Form state based on suppliers table schema
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Function to fetch suppliers
    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            // We'll create this API endpoint next
            const response = await fetch('/api/suppliers');
            if (!response.ok) throw new Error('Failed to fetch suppliers');
            const data = await response.json();
            setSuppliers(data || []);
        } catch (error) {
            console.error("Failed to fetch suppliers:", error);
            alert(`Error fetching suppliers: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch suppliers on component mount
    useEffect(() => {
        fetchSuppliers();
    }, []);

    // Function to reset the form fields
    const resetForm = () => {
        setName('');
        setContactPerson('');
        setEmail('');
        setPhone('');
        setEditingSupplier(null);
    };

    // Function to populate the form for editing
    const handleEdit = (supplier) => {
        setEditingSupplier(supplier);
        setName(supplier.name);
        setContactPerson(supplier.contact_person || ''); //
        setEmail(supplier.email || ''); //
        setPhone(supplier.phone || ''); //
    };

    // Function to handle deleting a supplier
    const handleDelete = async (supplierId) => {
        // Optional: Add check if supplier is linked to purchase orders first
        // const { count } = await supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('supplier_id', supplierId);
        // if (count > 0) { alert('Cannot delete supplier linked to purchase orders.'); return; }

        if (!confirm('Are you sure you want to delete this supplier?')) {
            return;
        }
        try {
            // We'll create this API endpoint next
            const response = await fetch(`/api/suppliers/${supplierId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete supplier');
            }
            fetchSuppliers(); // Refetch to update the list
            alert('Supplier deleted successfully!');
        } catch (error) {
            alert(`Error deleting supplier: ${error.message}`);
        }
    };

    // Function to handle form submission (create or update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        const isEditing = !!editingSupplier;
        const url = isEditing ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers';
        const method = isEditing ? 'PUT' : 'POST';

        // Basic validation
        if (!name) {
            alert('Supplier Name is required.');
            return;
        }

        const body = {
            name, //
            contact_person: contactPerson || null, //
            email: email || null, //
            phone: phone || null, //
        };

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} supplier`);
            }

            resetForm();
            fetchSuppliers(); // Refetch the list to show changes
            alert(`Supplier ${isEditing ? 'updated' : 'created'} successfully!`);
        } catch (error) {
            alert(`Error saving supplier: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Manage Suppliers</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form for adding/editing */}
                <div className="md:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-4">
                        <h2 className="text-xl font-semibold">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                        <div>
                            <label htmlFor="supplierName" className="block text-sm font-medium mb-1">Supplier Name</label>
                            <input
                                id="supplierName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="contactPerson" className="block text-sm font-medium mb-1">Contact Person (Optional)</label>
                            <input
                                id="contactPerson"
                                type="text"
                                value={contactPerson}
                                onChange={(e) => setContactPerson(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-1">Email (Optional)</label>
                            <input
                                id="email"
                                type="email" // Use type="email" for basic validation
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone (Optional)</label>
                            <input
                                id="phone"
                                type="tel" // Use type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"
                            />
                        </div>

                        <div className="flex gap-4 pt-2">
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
                                {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                            </button>
                            {editingSupplier && (
                                <button type="button" onClick={resetForm} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List of existing suppliers */}
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Existing Suppliers</h2>
                    {isLoading ? <p>Loading suppliers...</p> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900">
                                <tr>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Contact Person</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Phone</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {suppliers.map(supplier => (
                                    <tr key={supplier.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-sm">
                                        <td className="p-3 font-medium">{supplier.name}</td>
                                        <td className="p-3">{supplier.contact_person || '-'}</td>
                                        <td className="p-3">{supplier.email || '-'}</td>
                                        <td className="p-3">{supplier.phone || '-'}</td>
                                        <td className="p-3 flex gap-2 whitespace-nowrap">
                                            <button onClick={() => handleEdit(supplier)} className="text-indigo-400 hover:text-indigo-300 font-semibold">Edit</button>
                                            <button onClick={() => handleDelete(supplier.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            { !isLoading && suppliers.length === 0 && <p className="text-gray-500 mt-4 text-center">No suppliers added yet.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}