// context/AdminAuthContext.js
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
    const [supabase] = useState(() => createClientComponentClient());
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Centralized Role Verification Logic
    // Using useCallback to ensure stability and prevent unnecessary re-renders
    const verifyRole = useCallback(async (currentSession) => {
        if (!currentSession?.user) {
            setUserRole(null);
            return null;
        }

        try {
            const { data: role, error } = await supabase.rpc('get_user_role');
            if (error) throw error;

            setUserRole(role);
            return role;
        } catch (err) {
            console.error("Xác minh vai trò thất bại:", err);
            setUserRole(null);
            return null;
        }
    }, [supabase]);

    // Handler for Auth State Changes
    // Handles both initial load and real-time updates
    const handleAuthChange = useCallback(async (event, currentSession, mounted) => {
        if (!mounted) return;

        setSession(currentSession);

        // If we have a session, verify the role.
        // This covers INITIAL_SESSION, SIGNED_IN, and TOKEN_REFRESHED.
        if (currentSession) {
            // Optional: You can check if event === 'TOKEN_REFRESHED' to skip verifying if not needed,
            // but verifying ensures security is always up to date.
            await verifyRole(currentSession);
        } else {
            setUserRole(null);
        }

        setIsLoading(false);
    }, [verifyRole]);

    // Initialize and Listen for Auth Changes
    useEffect(() => {
        let mounted = true;

        // onAuthStateChange fires immediately with the current session (INITIAL_SESSION),
        // so we don't need a separate getSession() call which was causing the race condition.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            handleAuthChange(event, session, mounted).then(r => {});
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, [supabase, handleAuthChange]);

    // --- Admin-specific LOGIN function ---
    const login = async (email, password) => {
        // 1. Sign in normally
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (loginError) throw new Error(loginError.message);
        if (!loginData.user) throw new Error("Đăng nhập thất bại, không tìm thấy người dùng.");

        // 2. Verify Admin Role Immediately
        const role = await verifyRole(loginData.session);

        if (role !== 'admin') {
            await supabase.auth.signOut();
            throw new Error("Truy cập bị từ chối: Bạn không phải là quản trị viên được ủy quyền.");
        }

        return { success: true };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUserRole(null);
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
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error('useAdminAuth phải được sử dụng trong AdminAuthProvider');
    }
    return context;
}