'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import storage, { seedInitialData } from '@/lib/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize - check for existing session
    useEffect(() => {
        seedInitialData(); // Seed demo data on first load

        const savedUser = localStorage.getItem('funlms_current_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                localStorage.removeItem('funlms_current_user');
            }
        }
        setIsLoading(false);
    }, []);

    // Login function
    const login = useCallback((username, password) => {
        const users = storage.users.getAll();
        const foundUser = users.find(
            u => u.username === username && u.password === password
        );

        if (foundUser) {
            const { password: _, ...userWithoutPassword } = foundUser;
            setUser(userWithoutPassword);
            localStorage.setItem('funlms_current_user', JSON.stringify(userWithoutPassword));
            return { success: true, user: userWithoutPassword };
        }

        return { success: false, error: 'Invalid username or password' };
    }, []);

    // Logout function
    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('funlms_current_user');
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
