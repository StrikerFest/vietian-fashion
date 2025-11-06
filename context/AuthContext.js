// context/AuthContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
// 1. Import the new auth helper
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    // 2. Create the client-side Supabase client
    // We use useState to ensure it's created only once per component instance
    const [supabase] = useState(() => createClientComponentClient());

    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // 3. Use useEffect to get the initial session and listen for auth changes
    useEffect(() => {
        // Asynchronously get the initial session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setIsLoading(false);
        };

        getSession();

        // 4. Listen for auth state changes (login, logout)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);
                setIsLoading(false);
            }
        );

        // 5. Clean up the listener on component unmount
        return () => {
            authListener?.unsubscribe();
        };
    }, [supabase]);

    // 6. Provide the session, auth client, and loading state to children
    const value = {
        supabase,
        session,
        isLoading,
    };

    // We don't render children until we've checked for a session
    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
}

// 7. Create a custom hook to easily access the auth state
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}