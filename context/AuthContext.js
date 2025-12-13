// context/AuthContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [supabase] = useState(() => createClientComponentClient());
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Get initial session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setIsLoading(false);
        };

        getSession();

        // 2. Listen for auth changes
        // FIXED: Destructure { subscription } from the returned data object
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);
                setIsLoading(false);
            }
        );

        // 3. Cleanup
        return () => {
            // FIXED: Call unsubscribe on the subscription object
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [supabase]);

    const value = {
        supabase,
        session,
        isLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}