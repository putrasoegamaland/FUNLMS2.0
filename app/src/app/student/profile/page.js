'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useLanguage } from '@/contexts/LanguageContext';
import storage from '@/lib/storage';
import { AvatarPicker, getAvatarEmoji } from '@/components/AvatarPicker';

export default function StudentProfilePage() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { level, totalXp, streak, getUnlockedBadges } = useGame();
    const { locale, toggleLanguage } = useLanguage();
    const [stats, setStats] = useState({ quizzes: 0, perfectScores: 0, subjects: 0 });
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [avatar, setAvatar] = useState(null);

    useEffect(() => {
        const attempts = storage.attempts?.getAll?.()?.filter(a => a.studentId === user?.id) || [];
        const perfectScores = attempts.filter(a => a.score === 100).length;
        const subjects = new Set(attempts.map(a => a.subjectId).filter(Boolean));

        setStats({
            quizzes: attempts.length,
            perfectScores,
            subjects: subjects.size,
        });

        // Load user's avatar
        if (user?.id) {
            const userData = storage.users.getById(user.id);
            setAvatar(userData?.avatar || null);
        }
    }, [user]);

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    const handleAvatarSelect = (avatarId) => {
        setAvatar(avatarId);
        // Save to storage
        if (user?.id) {
            storage.users.update(user.id, { avatar: avatarId });
        }
    };

    const unlockedBadges = getUnlockedBadges?.() || [];
    const avatarEmoji = getAvatarEmoji(avatar);

    return (
        <div className="p-4 space-y-6">
            {/* Avatar Picker Modal */}
            <AvatarPicker
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                currentAvatar={avatar}
                onSelect={handleAvatarSelect}
            />

            {/* Profile Header */}
            <div className="text-center">
                <button
                    onClick={() => setShowAvatarPicker(true)}
                    className="relative group"
                >
                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center text-white text-4xl font-bold mb-3 transition-transform group-hover:scale-105">
                        {avatarEmoji || user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="absolute bottom-2 right-1/2 translate-x-8 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>edit</span>
                    </div>
                </button>
                <h2 className="text-xl font-bold text-text-main">{user?.name}</h2>
                <p className="text-text-muted">@{user?.username}</p>

                {/* Level Badge */}
                <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-primary/10 rounded-full">
                    <span className="text-lg">⭐</span>
                    <span className="font-bold text-primary">Level {level}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-2xl font-bold text-primary">{totalXp}</p>
                    <p className="text-xs text-text-muted">Total XP</p>
                </div>
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-2xl font-bold text-orange-500">{streak}</p>
                    <p className="text-xs text-text-muted">Day Streak</p>
                </div>
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-2xl font-bold text-yellow-500">{unlockedBadges.length}</p>
                    <p className="text-xs text-text-muted">Badges</p>
                </div>
            </div>

            {/* Achievements Summary */}
            <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                <h3 className="font-bold text-text-main mb-3">📊 Your Progress</h3>
                <div className="space-y-3">
                    <ProgressRow icon="📝" label="Quizzes Completed" value={stats.quizzes} />
                    <ProgressRow icon="💯" label="Perfect Scores" value={stats.perfectScores} />
                    <ProgressRow icon="📚" label="Subjects Explored" value={stats.subjects} />
                </div>
            </div>

            {/* Recent Badges */}
            {unlockedBadges.length > 0 && (
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-text-main">🏆 Recent Badges</h3>
                        <a href="/student/badges" className="text-primary text-sm font-semibold">See all</a>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {unlockedBadges.slice(0, 5).map((badge) => (
                            <div
                                key={badge.id}
                                className="shrink-0 w-16 h-16 rounded-xl bg-yellow-100 flex items-center justify-center text-2xl"
                            >
                                {badge.emoji}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Settings */}
            <div className="bg-card-light rounded-xl border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setShowAvatarPicker(true)}
                    className="w-full flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50"
                >
                    <span className="material-symbols-outlined text-text-muted">face</span>
                    <span className="flex-1 text-left text-text-main">Change Avatar</span>
                    <span className="text-2xl">{avatarEmoji || '🦁'}</span>
                </button>
                <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50"
                >
                    <span className="material-symbols-outlined text-text-muted">language</span>
                    <span className="flex-1 text-left text-text-main">Language</span>
                    <span className="text-text-muted">{locale === 'en' ? 'English 🇬🇧' : 'Indonesian 🇮🇩'}</span>
                </button>
                <button className="w-full flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50">
                    <span className="material-symbols-outlined text-text-muted">notifications</span>
                    <span className="flex-1 text-left text-text-main">Notifications</span>
                    <span className="material-symbols-outlined text-text-muted">chevron_right</span>
                </button>
                <button className="w-full flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50">
                    <span className="material-symbols-outlined text-text-muted">help</span>
                    <span className="flex-1 text-left text-text-main">Help & Support</span>
                    <span className="material-symbols-outlined text-text-muted">chevron_right</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-4 hover:bg-red-50"
                >
                    <span className="material-symbols-outlined text-red-500">logout</span>
                    <span className="flex-1 text-left text-red-500">Log Out</span>
                </button>
            </div>
        </div>
    );
}

function ProgressRow({ icon, label, value }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-lg">{icon}</span>
            <span className="flex-1 text-text-muted">{label}</span>
            <span className="font-bold text-text-main">{value}</span>
        </div>
    );
}
