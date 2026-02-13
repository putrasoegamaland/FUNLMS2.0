'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { findUserByCredentials } from '@/hooks/useSupabaseData';
import { seedSupabaseData } from '@/lib/seedSupabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize - check for existing session and seed data
    useEffect(() => {
        const init = async () => {
            // Check for existing session FIRST (instant, no network)
            const savedUser = localStorage.getItem('funlms_current_user');
            if (savedUser) {
                try {
                    setUser(JSON.parse(savedUser));
                } catch (e) {
                    localStorage.removeItem('funlms_current_user');
                }
            }
            setIsLoading(false);

            // Auto-detect if we're on a Local Hub network
            // Only check if hostname looks like a local IP (not on Vercel/cloud)
            const hostname = window.location.hostname;
            const isLocalNetwork = hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.');

            if (isLocalNetwork) {
                try {
                    const res = await fetch('/api/local/health', {
                        signal: AbortSignal.timeout(2000) // 2 second timeout max
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.available) {
                            // Local hub is running! Set mode for data routing
                            const currentMode = localStorage.getItem('funlms_network_mode');
                            if (currentMode !== 'local-hub') {
                                // Only set guest-wifi if not the teacher (teacher uses local-hub)
                                localStorage.setItem('funlms_network_mode', 'guest-wifi');
                                console.log('🏠 Local Hub detected! Routing data locally.');
                            }
                        }
                    }
                } catch (e) {
                    // Health check failed — no local hub, continue normally
                }
            } else {
                // On cloud/Vercel — ensure we're NOT in guest-wifi mode
                const currentMode = localStorage.getItem('funlms_network_mode');
                if (currentMode === 'guest-wifi') {
                    localStorage.removeItem('funlms_network_mode');
                    console.log('☁️ Cloud deployment detected, clearing guest-wifi mode.');
                }
            }

            // Seed demo data ONLY if online (skip if local-hub or guest-wifi)
            const mode = localStorage.getItem('funlms_network_mode');
            if (mode !== 'local-hub' && mode !== 'guest-wifi') {
                try {
                    await seedSupabaseData();
                } catch (e) {
                    console.log('Seed error (may be expected):', e);
                }
            }
        };

        init();
    }, []);

    // Login function — tries LOCAL FIRST (on LAN only), then Supabase
    const login = useCallback(async (username, password) => {
        // STEP 1: Try Local API first (only on local network)
        const hostname = window.location.hostname;
        const isLocalNetwork = hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.');

        if (isLocalNetwork) {
            try {
                const res = await fetch('/api/local/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                    signal: AbortSignal.timeout(3000) // 3 second timeout
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.user) {
                        setUser(data.user);
                        localStorage.setItem('funlms_current_user', JSON.stringify(data.user));
                        localStorage.setItem('funlms_network_mode', 'guest-wifi');
                        console.log('✅ Logged in via Local Hub');
                        return { success: true, user: data.user };
                    }
                }
                // 401 or other non-ok: fall through to Supabase
            } catch (localErr) {
                console.log('Local login unavailable, trying Supabase...', localErr.message);
            }
        }

        // STEP 2: Fall back to Supabase/IndexedDB (original behavior)
        try {
            const foundUser = await findUserByCredentials(username, password);

            if (foundUser) {
                const { password: _, ...userWithoutPassword } = foundUser;
                setUser(userWithoutPassword);
                localStorage.setItem('funlms_current_user', JSON.stringify(userWithoutPassword));
                return { success: true, user: userWithoutPassword };
            }

            return { success: false, error: 'Invalid username or password' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }, []);

    // Logout function
    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('funlms_current_user');
        // Also clear guest-wifi mode on logout
        const mode = localStorage.getItem('funlms_network_mode');
        if (mode === 'guest-wifi') {
            localStorage.removeItem('funlms_network_mode');
        }
    }, []);

    // Get redirect path based on role
    const getRedirectPath = useCallback(() => {
        if (!user) return '/login';
        switch (user.role) {
            case 'admin': return '/admin/dashboard';
            case 'teacher': return '/teacher/dashboard';
            case 'student': return '/student/learn';
            default: return '/login';
        }
    }, [user]);

    // Check if user has required role
    const hasRole = useCallback((requiredRole) => {
        if (!user) return false;
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(user.role);
        }
        return user.role === requiredRole;
    }, [user]);

    const value = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        getRedirectPath,
        hasRole,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
