'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ResponsiveLayout from '@/components/ResponsiveLayout';

// Define navigation items for student
const studentNavItems = [
    { href: '/student/learn', icon: 'home', label: 'Learning Hub' },
    { href: '/student/books', icon: 'menu_book', label: 'My Books' },
    { href: '/student/videos', icon: 'play_circle', label: 'Watch Videos' },
    { href: '/student/assignments', icon: 'assignment', label: 'My Tasks' },
    { href: '/student/games', icon: 'sports_esports', label: 'Play Games' },
    { href: '/student/profile', icon: 'person', label: 'My Profile' },
];

export default function StudentLayout({ children }) {
    const router = useRouter();
    const { user, isLoading, hasRole, logout } = useAuth();
    const { initForUser, xp, level, streak } = useGame();
    const { toggleLanguage, locale } = useLanguage();

    useEffect(() => {
        if (!isLoading && !hasRole('student')) {
            router.replace('/login');
        }
    }, [isLoading, hasRole, router]);

    // Initialize game context for this user
    useEffect(() => {
        if (user?.id) {
            initForUser(user.id);
        }
    }, [user?.id, initForUser]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!hasRole('student')) return null;

    // Header content with XP & Streak
    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                    <span className="text-sm">🔥</span>
                    <span className="text-sm font-bold text-orange-600">{streak}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full">
                    <span className="text-sm">⭐</span>
                    <span className="text-sm font-bold text-yellow-600">{xp}</span>
                </div>
                {/* Show level badge */}
                <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
                    <span className="text-sm">🏆</span>
                    <span className="text-sm font-bold text-purple-600">Level {level}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={toggleLanguage}
                    className="p-2 rounded-full bg-gray-100 text-sm hover:bg-gray-200 transition-colors"
                >
                    {locale === 'en' ? '🇮🇩' : '🇬🇧'}
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center text-white font-bold text-xl">
                    {user?.avatar || user?.name?.charAt(0) || '?'}
                </div>
            </div>
        </div>
    );

    return (
        <ResponsiveLayout
            navItems={studentNavItems}
            role="student"
            header={headerContent}
        >
            {children}
        </ResponsiveLayout>
    );
}
