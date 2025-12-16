// context/AdminAuthContext.js
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
    const [supabase] = useState(() => createClientComponentClient());
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // [FIX] Track the last processed token to prevent redundant verification loops
    const lastProcessedToken = useRef(null);

    // Centralized Role Verification Logic
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
            // Don't set null immediately if it's just a network glitch?
            // For security, strictly nullifying is safer, but might cause temporary access denial.
            setUserRole(null);
            return null;
        }
    }, [supabase]);

    // Handler for Auth State Changes
    const handleAuthChange = useCallback(async (event, currentSession, mounted) => {
        if (!mounted) return;

        // [FIX] Optimization: If session exists and token is same as last checked, skip verification
        if (currentSession && currentSession.access_token === lastProcessedToken.current && userRole) {
            // Already verified this session, just ensure loading is false
            setIsLoading(false);
            return;
        }

        setSession(currentSession);

        if (currentSession) {
            lastProcessedToken.current = currentSession.access_token;
            await verifyRole(currentSession);
        } else {
            lastProcessedToken.current = null;
            setUserRole(null);
        }

        setIsLoading(false);
    }, [verifyRole, userRole]);

    // Initialize and Listen for Auth Changes
    useEffect(() => {
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            handleAuthChange(event, session, mounted);
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, [supabase, handleAuthChange]);

    // --- Admin-specific LOGIN function ---
    const login = async (email, password) => {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (loginError) throw new Error(loginError.message);
        if (!loginData.user) throw new Error("Đăng nhập thất bại, không tìm thấy người dùng.");

        // Force verify immediately after login action
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
        lastProcessedToken.current = null;
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