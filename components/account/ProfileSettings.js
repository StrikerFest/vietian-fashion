'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

export default function ProfileSettings() {
    const { supabase } = useAuth();
    const { addToast } = useToast();

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        email: '' // Read-only
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/account/profile');
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        phone: data.phone || '',
                        email: data.email || ''
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/account/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    phone: formData.phone
                })
            });

            if (!res.ok) throw new Error('Failed to update profile');

            addToast('Profile updated successfully!', 'success');
        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!confirm("Send password reset email to " + formData.email + "?")) return;

        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
            redirectTo: `${window.location.origin}/account/reset-password`, // You'd need to build this page eventually
        });

        if (error) {
            addToast(error.message, 'error');
        } else {
            addToast('Password reset email sent!', 'success');
        }
    };

    if (isLoading) return <div className="animate-pulse h-48 bg-gray-800 rounded-lg"></div>;

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-md h-full">
            <h2 className="text-2xl font-bold mb-6 text-white">Profile Settings</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">First Name</label>
                        <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">Last Name</label>
                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-400">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-400">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2.5 text-gray-400 cursor-not-allowed"
                    />
                </div>

                <div className="pt-2 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={handlePasswordReset}
                        className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                        Reset Password
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-bold transition-colors disabled:bg-gray-600"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}