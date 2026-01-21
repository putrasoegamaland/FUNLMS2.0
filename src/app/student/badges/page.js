'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';

export default function StudentBadgesPage() {
    const { user } = useAuth();
    const { getUnlockedBadges, getLockedBadges, progress } = useGame();
    const [unlockedBadges, setUnlockedBadges] = useState([]);
    const [lockedBadges, setLockedBadges] = useState([]);
    const [selectedBadge, setSelectedBadge] = useState(null);

    useEffect(() => {
        setUnlockedBadges(getUnlockedBadges?.() || []);
        setLockedBadges(getLockedBadges?.() || []);
    }, [getUnlockedBadges, getLockedBadges, progress]);

    const getBadgeProgress = (badge) => {
        if (!badge.condition || !progress) return 0;

        switch (badge.condition.type) {
            case 'total_xp':
                return Math.min(100, ((progress.totalXp || 0) / badge.condition.value) * 100);
            case 'level':
                return Math.min(100, ((progress.level || 1) / badge.condition.value) * 100);
            case 'streak':
                return Math.min(100, ((progress.streak || 0) / badge.condition.value) * 100);
            case 'subject_xp':
                const subjectXp = progress.subjectXp?.[badge.condition.subject] || 0;
                return Math.min(100, (subjectXp / badge.condition.value) * 100);
            default:
                return 0;
        }
    };

    return (
        <div className="p-4 space-y-6">
            {/* Header with total count */}
            <div className="text-center">
                <div className="text-4xl mb-2">🏆</div>
                <h2 className="text-xl font-bold text-text-main">My Badges</h2>
                <p className="text-text-muted">
                    {unlockedBadges.length} / {unlockedBadges.length + lockedBadges.length} unlocked
                </p>
            </div>

            {/* Unlocked Badges */}
            {unlockedBadges.length > 0 && (
                <section>
                    <h3 className="font-bold text-text-main mb-3">✨ Unlocked</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {unlockedBadges.map((badge) => (
                            <button
                                key={badge.id}
                                onClick={() => setSelectedBadge(badge)}
                                className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-50 border border-yellow-200"
                            >
                                <div className="text-4xl mb-2">{badge.emoji}</div>
                                <p className="text-xs font-bold text-text-main text-center leading-tight">{badge.name}</p>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Locked Badges */}
            {lockedBadges.length > 0 && (
                <section>
                    <h3 className="font-bold text-text-main mb-3">🔒 Locked</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {lockedBadges.map((badge) => {
                            const progressPercent = getBadgeProgress(badge);

                            return (
                                <button
                                    key={badge.id}
                                    onClick={() => setSelectedBadge(badge)}
                                    className="flex flex-col items-center p-4 rounded-xl bg-gray-100 border border-gray-200 relative overflow-hidden"
                                >
                                    <div className="text-4xl mb-2 grayscale opacity-50">{badge.emoji}</div>
                                    <p className="text-xs font-medium text-text-muted text-center leading-tight">{badge.name}</p>

                                    {/* Progress indicator */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* No Badges */}
            {unlockedBadges.length === 0 && lockedBadges.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                    <div className="text-4xl mb-4">🎖️</div>
                    <p>No badges yet</p>
                    <p className="text-sm">Complete quizzes to earn badges!</p>
                </div>
            )}

            {/* Badge Detail Modal */}
            {selectedBadge && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedBadge(null)}
                >
                    <div
                        className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`text-6xl mb-4 ${!unlockedBadges.find(b => b.id === selectedBadge.id) ? 'grayscale opacity-50' : ''}`}>
                            {selectedBadge.emoji}
                        </div>
                        <h3 className="text-xl font-bold text-text-main mb-2">{selectedBadge.name}</h3>
                        <p className="text-text-muted mb-4">{selectedBadge.description}</p>

                        {!unlockedBadges.find(b => b.id === selectedBadge.id) && (
                            <div className="mb-4">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${getBadgeProgress(selectedBadge)}%` }}
                                    />
                                </div>
                                <p className="text-sm text-text-muted">
                                    {Math.round(getBadgeProgress(selectedBadge))}% complete
                                </p>
                            </div>
                        )}

                        {unlockedBadges.find(b => b.id === selectedBadge.id) && (
                            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full inline-block font-bold">
                                ✅ Unlocked!
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedBadge(null)}
                            className="mt-4 w-full py-3 bg-gray-100 text-text-main font-bold rounded-xl"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
