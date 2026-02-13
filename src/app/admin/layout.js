'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ResponsiveLayout from '@/components/ResponsiveLayout';

// Define navigation items for admin (optimized for mobile)
const adminNavItems = [
    { href: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { href: '/admin/users', icon: 'group', label: 'Users' },
    { href: '/admin/classes', icon: 'class', label: 'Classes' },
    { href: '/admin/question-bank', icon: 'inventory_2', label: 'Questions' },
    { href: '/admin/question-review', icon: 'fact_check', label: 'QC Review' },
    { href: '/admin/activity', icon: 'history', label: 'Activity' },
    { href: '/admin/settings', icon: 'settings', label: 'Settings' },
];


export default function AdminLayout({ children }) {
    const router = useRouter();
    const { user, isLoading, hasRole, logout } = useAuth();
    const { t, toggleLanguage, locale } = useLanguage();

    useEffect(() => {
        if (!isLoading && !hasRole('admin')) {
            router.replace('/login');
        }
    }, [isLoading, hasRole, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!hasRole('admin')) {
        return null;
    }

    // Header content
    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-lg">👨‍💼</span>
                </div>
                <div>
                    <h2 className="text-text-main font-bold">{t('dashboard')}</h2>
                    <p className="text-xs text-text-muted">{t('welcome_back')}, {user?.name}!</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={toggleLanguage}
                    className="p-2 rounded-full bg-gray-100 text-sm hover:bg-gray-200 transition-colors"
                >
                    {locale === 'en' ? '🇮🇩' : '🇬🇧'}
                </button>
                <button
                    onClick={logout}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 20 }}>
                        logout
                    </span>
                </button>
            </div>
        </div>
    );

    return (
        <ResponsiveLayout
            navItems={adminNavItems}
            role="admin"
            header={headerContent}
        >
            {children}
        </ResponsiveLayout>
    );
}
