// context/AdminAuthContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
    const [supabase] = useState(() => createClientComponentClient());
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Centralized Role Verification Logic
    const verifyRole = async (currentSession) => {
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
    };

    // Initialize and Listen for Auth Changes
    useEffect(() => {
        // 1. Initial Check
        const initSession = async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                setSession(currentSession);
                if (currentSession) {
                    await verifyRole(currentSession);
                }
            } catch (error) {
                console.error("Lỗi khởi tạo Auth Admin:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();

        // 2. Real-time Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            setSession(currentSession);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await verifyRole(currentSession);
            } else if (event === 'SIGNED_OUT') {
                setUserRole(null);
            }

            setIsLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [supabase]);

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
        // We do this explicitly here to prevent non-admins from even entering the session state
        // if they try to login via the Admin Portal.
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