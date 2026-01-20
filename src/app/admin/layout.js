'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

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

    return (
        <div className="min-h-screen bg-background-light">
            {/* Top Header */}
            <header className="sticky top-0 z-50 bg-card-light/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
                <div className="max-w-md mx-auto flex items-center justify-between">
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
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto pb-24">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-card-light border-t border-gray-100 pb-safe z-50">
                <div className="max-w-md mx-auto flex justify-around items-center py-2">
                    <NavItem href="/admin/dashboard" icon="dashboard" label={t('home')} />
                    <NavItem href="/admin/users" icon="group" label={t('users')} />
                    <NavItem href="/admin/classes" icon="class" label={t('classes')} />
                    <NavItem href="/admin/gamification" icon="emoji_events" label="XP" />
                    <NavItem href="/admin/settings" icon="settings" label="Settings" />
                </div>
            </nav>
        </div>
    );
}

function NavItem({ href, icon, label }) {
    const isActive = typeof window !== 'undefined' && window.location.pathname === href;

    return (
        <a
            href={href}
            className={`flex flex-col items-center gap-1 p-2 ${isActive ? 'text-primary' : 'text-text-muted hover:text-text-main'} transition-colors`}
        >
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {icon}
            </span>
            <span className="text-[10px] font-medium">{label}</span>
        </a>
    );
}
