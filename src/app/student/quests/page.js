'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useUsers, useAllProgress } from '@/hooks/useSupabaseData';

export default function StudentQuestsPage() {
    const { user } = useAuth();
    const { xp, streak, level } = useGame();
    const { data: allUsers, loading: usersLoading } = useUsers({ role: 'student' });
    const { data: allProgress, loading: progressLoading } = useAllProgress();

    const isLoading = usersLoading || progressLoading;

    // Calculate leaderboard from progress table (where XP is actually stored)
    const leaderboard = useMemo(() => {
        return allUsers.map(student => {
            const studentProgress = allProgress.find(p => p.user_id === student.id);
            const totalXp = studentProgress?.total_xp || 0;
            const level = studentProgress?.level || 1;
            return {
                ...student,
                progress: { totalXp, level },
            };
        }).sort((a, b) => (b.progress?.totalXp || 0) - (a.progress?.totalXp || 0));
    }, [allUsers, allProgress]);

    const userRank = leaderboard.findIndex(s => s.id === user?.id) + 1;

    // Daily quests
    const dailyQuests = [
        { id: 1, title: 'Complete 1 quiz', icon: '📝', xp: 20, progress: 0, target: 1 },
        { id: 2, title: 'Earn 50 XP', icon: '⭐', xp: 10, progress: Math.min(50, xp), target: 50 },
        { id: 3, title: 'Read a book', icon: '📚', xp: 15, progress: 0, target: 1 },
    ];

    return (
        <div className="p-4 space-y-6">
            {/* User Rank Card */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/80 text-sm">Your Rank</p>
                        <p className="text-3xl font-bold">#{userRank || '-'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-white/80 text-sm">Level {level}</p>
                        <p className="text-2xl font-bold">🔥 {streak} days</p>
                    </div>
                </div>
            </div>

            {/* Daily Quests */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-text-main">🎯 Daily Quests</h3>
                    <span className="text-xs text-text-muted">Resets in 12h</span>
                </div>
                <div className="space-y-3">
                    {dailyQuests.map((quest) => {
                        const completed = quest.progress >= quest.target;
                        const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);

                        return (
                            <div
                                key={quest.id}
                                className={`flex items-center gap-3 p-4 rounded-xl border ${completed ? 'bg-green-50 border-green-200' : 'bg-card-light border-gray-100'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${completed ? 'bg-green-100' : 'bg-gray-100'
                                    }`}>
                                    {completed ? '✅' : quest.icon}
                                </div>
                                <div className="flex-1">
                                    <p className={`font-medium ${completed ? 'text-green-700' : 'text-text-main'}`}>
                                        {quest.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${completed ? 'bg-green-500' : 'bg-primary'}`}
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-text-muted">
                                            {quest.progress}/{quest.target}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-sm font-bold ${completed ? 'text-green-600' : 'text-yellow-600'}`}>
                                        +{quest.xp} XP
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Leaderboard */}
            <section>
                <h3 className="font-bold text-text-main mb-3">🏆 Leaderboard</h3>
                <div className="bg-card-light rounded-xl border border-gray-100 overflow-hidden">
                    {leaderboard.slice(0, 10).map((student, i) => {
                        const isCurrentUser = student.id === user?.id;
                        const medals = ['🥇', '🥈', '🥉'];

                        return (
                            <div
                                key={student.id}
                                className={`flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0 ${isCurrentUser ? 'bg-primary/5' : ''
                                    }`}
                            >
                                <span className="w-8 text-center font-bold text-text-muted">
                                    {i < 3 ? medals[i] : i + 1}
                                </span>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isCurrentUser ? 'bg-primary' : 'bg-gray-300'
                                    }`}>
                                    {student.name?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className={`font-medium ${isCurrentUser ? 'text-primary' : 'text-text-main'}`}>
                                        {student.name} {isCurrentUser && '(You)'}
                                    </p>
                                    <p className="text-xs text-text-muted">Level {student.progress?.level || 1}</p>
                                </div>
                                <span className="font-bold text-yellow-600">
                                    {student.progress?.totalXp || 0} XP
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
