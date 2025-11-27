// context/AdminAuthContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// --- Define our custom keys for admin localStorage ---
const ADMIN_SESSION_KEY = 'supabase.admin.session';
const ADMIN_ROLE_KEY = 'supabase.admin.role';

const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
    const [supabase] = useState(() => createClientComponentClient());
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount, load the admin session from localStorage
    useEffect(() => {
        try {
            const savedSession = localStorage.getItem(ADMIN_SESSION_KEY);
            const savedRole = localStorage.getItem(ADMIN_ROLE_KEY);

            if (savedSession && savedRole === 'admin') {
                setSession(JSON.parse(savedSession));
                setUserRole(savedRole);
            }
        } catch (error) {
            console.error("Failed to load admin session from localStorage", error);
            localStorage.removeItem(ADMIN_SESSION_KEY);
            localStorage.removeItem(ADMIN_ROLE_KEY);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Admin-specific LOGIN function ---
    const login = async (email, password) => {
        // 1. Sign in normally to verify credentials
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (loginError) throw new Error(loginError.message);
        if (!loginData.user) throw new Error("Login failed, user not found.");

        // 2. Credentials are correct, NOW check if they are an admin
        const { data: role, error: rpcError } = await supabase.rpc('get_user_role');

        if (rpcError) throw new Error(`Failed to verify role: ${rpcError.message}`);
        if (role !== 'admin') {
            // Not an admin. Sign out immediately to clear the cookie.
            await supabase.auth.signOut();
            throw new Error("Access Denied: You are not an admin.");
        }

        // 3. User is an admin! Save session to localStorage
        const adminSession = loginData.session;
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminSession));
        localStorage.setItem(ADMIN_ROLE_KEY, 'admin');

        // 4. Update the context state
        setSession(adminSession);
        setUserRole('admin');

        // 5. [CRITICAL FIX] DO NOT SIGN OUT HERE.
        // We keep the Supabase cookie active so Middleware and API routes pass.
        // The "Customer" part of the site will see this user as logged in,
        // which is acceptable (Admins can be customers too).

        return { success: true };
    };

    // --- Admin-specific LOGOUT function ---
    const logout = async () => {
        // Clear state and localStorage
        setSession(null);
        setUserRole(null);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(ADMIN_ROLE_KEY);

        // Also sign out of Supabase to clear the cookie
        await supabase.auth.signOut();
    };

    const value = {
        supabase,
        session,
        userRole,
        isLoading,
        login,
        logout,
    };

    return (
        <AdminAuthContext.Provider value={value}>
            {!isLoading && children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
}