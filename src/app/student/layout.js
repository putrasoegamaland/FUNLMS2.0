'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useLanguage } from '@/contexts/LanguageContext';

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

    return (
        <div className="min-h-screen bg-background-light">
            {/* Top Header with XP & Streak */}
            <header className="sticky top-0 z-50 bg-card-light/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                            <span className="text-sm">🔥</span>
                            <span className="text-sm font-bold text-orange-600">{streak}</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full">
                            <span className="text-sm">⭐</span>
                            <span className="text-sm font-bold text-yellow-600">{xp}</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center text-white font-bold">
                        {user?.name?.charAt(0) || '?'}
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
                    <NavItem href="/student/learn" icon="home" label="Home" />
                    <NavItem href="/student/books" icon="menu_book" label="Books" />
                    <NavItem href="/student/videos" icon="play_circle" label="Videos" />
                    <NavItem href="/student/assignments" icon="assignment" label="Tasks" />
                    <NavItem href="/student/games" icon="sports_esports" label="Games" />
                    <NavItem href="/student/profile" icon="person" label="Me" />
                </div>
            </nav>
        </div>
    );
}

function NavItem({ href, icon, label }) {
    const isActive = typeof window !== 'undefined' && window.location.pathname.startsWith(href);

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
