'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useEnrollments, useAssignments, useSubmissions } from '@/hooks/useSupabaseData';
import Link from 'next/link';

export default function StudentHomePage() {
    const { user } = useAuth();
    const { level, xp, getUnlockedBadges } = useGame();
    const { data: enrollments, loading: enrollmentsLoading } = useEnrollments({ student_id: user?.id });
    const { data: allAssignments, loading: assignmentsLoading } = useAssignments();
    const { data: allSubmissions, loading: submissionsLoading } = useSubmissions({ student_id: user?.id });

    const [randomQuote, setRandomQuote] = useState('');

    const isLoading = enrollmentsLoading || assignmentsLoading || submissionsLoading;

    // Calculate stats
    const stats = useMemo(() => {
        const classIds = enrollments.map(e => e.class_id);
        const myAssignments = allAssignments.filter(a => classIds.includes(a.class_id));
        const pendingCount = myAssignments.filter(a => {
            const submission = allSubmissions.find(s => s.assignment_id === a.id);
            return !submission;
        }).length;

        const earnedBadges = getUnlockedBadges?.() || [];

        return {
            pendingAssignments: pendingCount,
            completedVideos: 0, // Would need video progress tracking
            badgesCount: earnedBadges.length,
        };
    }, [enrollments, allAssignments, allSubmissions, getUnlockedBadges]);

    useEffect(() => {
        const quotes = [
            "Learning is a superpower! 🦸‍♂️",
            "Every mistake is a lesson! 📚",
            "You are doing great! 🌟",
            "Keep pushing forward! 🚀",
            "Knowledge is power! 💡"
        ];
        setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Header / Greeting */}
            <div className="flex items-center gap-4 bg-gradient-to-r from-primary to-primary-dark p-6 rounded-3xl text-white shadow-lg">
                <div className="text-5xl bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-inner">
                    {user?.avatar || '👋'}
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Hi, {user?.name?.split(' ')[0] || 'Friend'}!</h1>
                    <p className="opacity-90">{randomQuote}</p>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-yellow-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-3xl mb-1">⭐</span>
                    <span className="text-xl font-bold text-yellow-800">{level}</span>
                    <span className="text-xs text-yellow-700 font-medium">Level</span>
                </div>
                <div className="bg-purple-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-3xl mb-1">⚡</span>
                    <span className="text-xl font-bold text-purple-800">{xp}</span>
                    <span className="text-xs text-purple-700 font-medium">Total XP</span>
                </div>
            </div>

            {/* Action Cards */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-text-main px-2">Start Learning</h2>

                <Link href="/student/assignments">
                    <div className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-primary hover:shadow-md transition-all mb-3 relative overflow-hidden">
                        <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            📋
                        </div>
                        <div className="flex-1 z-10">
                            <h3 className="font-bold text-text-main">Assignments</h3>
                            <p className="text-sm text-text-muted">
                                {stats.pendingAssignments > 0
                                    ? <span className="text-red-500 font-bold">{stats.pendingAssignments} tasks to do!</span>
                                    : "All caught up!"}
                            </p>
                        </div>
                        {stats.pendingAssignments > 0 && (
                            <div className="w-3 h-3 bg-red-500 rounded-full absolute top-4 right-4 animate-pulse"></div>
                        )}
                    </div>
                </Link>

                <div className="grid grid-cols-2 gap-3">
                    <Link href="/student/videos">
                        <div className="group bg-blue-50 p-4 rounded-2xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all h-full">
                            <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mb-3 text-xl group-hover:scale-110 transition-transform">
                                📺
                            </div>
                            <h3 className="font-bold text-blue-900">Watch Videos</h3>
                            <p className="text-xs text-blue-700 mt-1">{stats.completedVideos} completed</p>
                        </div>
                    </Link>

                    <Link href="/student/games">
                        <div className="group bg-green-50 p-4 rounded-2xl border border-green-100 hover:border-green-300 hover:shadow-md transition-all h-full">
                            <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center mb-3 text-xl group-hover:scale-110 transition-transform">
                                🎮
                            </div>
                            <h3 className="font-bold text-green-900">Play Games</h3>
                            <p className="text-xs text-green-700 mt-1">Fun learning!</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Quick Practice Banner */}
            <Link href="/student/practice">
                <div className="mt-6 bg-gradient-to-r from-orange-400 to-pink-500 p-5 rounded-3xl text-white shadow-lg flex items-center justify-between group">
                    <div>
                        <h3 className="font-bold text-lg">Daily Practice</h3>
                        <p className="text-white/90 text-sm">Earn XP by taking quizzes!</p>
                    </div>
                    <span className="text-3xl group-hover:scale-110 transition-transform">📝</span>
                </div>
            </Link>
        </div>
    );
}
