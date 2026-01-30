'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ResponsiveLayout from '@/components/ResponsiveLayout';

// Define navigation items for teacher
const teacherNavItems = [
    { href: '/teacher/dashboard', icon: 'home', label: 'Dashboard' },
    { href: '/teacher/books', icon: 'menu_book', label: 'Book Library' },
    { href: '/teacher/content', icon: 'quiz', label: 'Create Quiz' },
    { href: '/teacher/question-bank', icon: 'inventory_2', label: 'Question Bank' },
    { href: '/teacher/videos', icon: 'play_circle', label: 'Video Library' },
    { href: '/teacher/assignments', icon: 'assignment', label: 'Assignments' },
    { href: '/teacher/grading', icon: 'edit_note', label: 'Grading' },
    { href: '/teacher/games', icon: 'sports_esports', label: 'Games' },
    { href: '/teacher/analytics', icon: 'insights', label: 'Analytics' },
];

export default function TeacherLayout({ children }) {
    const router = useRouter();
    const { user, isLoading, hasRole, logout } = useAuth();
    const { t, toggleLanguage, locale } = useLanguage();

    useEffect(() => {
        if (!isLoading && !hasRole('teacher')) {
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

    if (!hasRole('teacher')) return null;

    // Header content (used in both mobile and desktop)
    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg">👩‍🏫</span>
                </div>
                <div>
                    <p className="text-xs text-text-muted">Good Morning,</p>
                    <h2 className="text-text-main font-bold">{user?.name}! 👋</h2>
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
            navItems={teacherNavItems}
            role="teacher"
            header={headerContent}
        >
            {children}
        </ResponsiveLayout>
    );
}
