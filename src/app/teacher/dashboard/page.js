'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses, useBooks, useEnrollments, useAttempts, useStudentActivity, useUsers } from '@/hooks/useSupabaseData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Helper function for relative time
function getTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

export default function TeacherDashboard() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { data: classes, loading: classesLoading } = useClasses({ teacher_id: user?.id });
    const { data: books, loading: booksLoading } = useBooks();
    const { data: enrollments, loading: enrollmentsLoading } = useEnrollments();
    const { data: attempts, loading: attemptsLoading } = useAttempts();
    const { data: studentActivities, loading: studentActivityLoading } = useStudentActivity();
    const { data: allStudents } = useUsers({ role: 'student' });

    const [recentActivity, setRecentActivity] = useState([]);

    const isLoading = classesLoading || booksLoading || enrollmentsLoading || attemptsLoading;

    // Calculate stats
    const totalStudents = new Set(enrollments.map(e => e.student_id)).size;
    const stats = {
        classes: classes.length,
        studentsPresent: totalStudents,
        totalStudents: totalStudents,
        booksUploaded: books.length,
    };

    // Get student name helper
    const getStudentName = (studentId) => {
        const student = allStudents?.find(u => u.id === studentId);
        return student?.name || 'Student';
    };

    const getStudentAvatar = (studentId) => {
        const student = allStudents?.find(u => u.id === studentId);
        return student?.avatar || '👤';
    };

    // Process student activities for display
    const studentActivityDisplay = useMemo(() => {
        if (!studentActivities || studentActivities.length === 0) return [];

        return studentActivities
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 8)
            .map(activity => {
                const icons = {
                    quiz_completed: '📝',
                    book_read: '📚',
                    video_watched: '🎬',
                    game_played: '🎮',
                    assignment_submitted: '📋',
                    login: '🔐',
                };
                const labels = {
                    quiz_completed: 'completed quiz',
                    book_read: 'read book',
                    video_watched: 'watched video',
                    game_played: 'played game',
                    assignment_submitted: 'submitted',
                    login: 'logged in',
                };
                return {
                    id: activity.id,
                    icon: icons[activity.activity_type] || '📌',
                    avatar: getStudentAvatar(activity.student_id),
                    studentName: getStudentName(activity.student_id),
                    action: labels[activity.activity_type] || activity.activity_type,
                    title: activity.entity_title,
                    score: activity.metadata?.score,
                    xp: activity.metadata?.xpEarned,
                    time: getTimeAgo(activity.created_at),
                };
            });
    }, [studentActivities, allStudents]);

    // Load recent activity
    useEffect(() => {
        const loadActivity = async () => {
            if (attempts.length === 0 || !isSupabaseConfigured()) return;

            const recentAttempts = attempts
                .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))
                .slice(0, 5);

            const activityWithDetails = await Promise.all(recentAttempts.map(async (attempt) => {
                let studentName = 'Student';
                let quizTitle = 'a quiz';

                if (supabase) {
                    const { data: student } = await supabase.from('users').select('name').eq('id', attempt.user_id).single();
                    const { data: quiz } = await supabase.from('assessments').select('title').eq('id', attempt.assessment_id).single();
                    studentName = student?.name || 'Student';
                    quizTitle = quiz?.title || 'a quiz';
                }

                return {
                    id: attempt.id,
                    icon: '✅',
                    title: `${studentName} completed`,
                    highlight: quizTitle,
                    desc: getTimeAgo(attempt.completed_at || attempt.created_at),
                    color: 'green'
                };
            }));

            setRecentActivity(activityWithDetails);
        };

        loadActivity();
    }, [attempts]);

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Stats Card */}
            <div className="bg-card-light rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">🎓</span>
                    <span className="font-bold text-text-main">My Classes</span>
                    <span className="ml-auto text-sm text-text-muted">{stats.classes} active</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background-light rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>group</span>
                            <span className="text-xs text-text-muted">-</span>
                        </div>
                        <p className="text-2xl font-bold text-text-main">{stats.studentsPresent}</p>
                        <p className="text-xs text-text-muted">Total Students</p>
                    </div>
                    <div className="bg-background-light rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 20 }}>menu_book</span>
                        </div>
                        <p className="text-2xl font-bold text-text-main">{stats.booksUploaded}</p>
                        <p className="text-xs text-text-muted">Books Uploaded</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <a
                    href="/teacher/books"
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-card-light border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-text-main" style={{ fontSize: 28 }}>folder_open</span>
                    </div>
                    <span className="font-bold text-text-main">Manage Books</span>
                </a>
                <a
                    href="/teacher/content"
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-primary text-white shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
                    </div>
                    <span className="font-bold">Create Content</span>
                </a>
            </div>

            {/* Student Activity */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-text-main font-bold">👨‍🎓 Student Activity</h3>
                    <span className="text-xs text-text-muted">{studentActivities?.length || 0} total</span>
                </div>
                <div className="space-y-2">
                    {studentActivityDisplay.length > 0 ? (
                        studentActivityDisplay.map(activity => (
                            <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl bg-card-light border border-gray-100 shadow-sm">
                                <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                                    {activity.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-main">
                                        <span className="font-bold">{activity.studentName}</span>
                                        <span className="text-text-muted"> {activity.action}</span>
                                    </p>
                                    {activity.title && (
                                        <p className="text-xs text-primary font-medium truncate">{activity.title}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {activity.score !== undefined && (
                                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                                {activity.score}%
                                            </span>
                                        )}
                                        {activity.xp !== undefined && (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                                                +{activity.xp} XP
                                            </span>
                                        )}
                                        <span className="text-xs text-text-muted">{activity.time}</span>
                                    </div>
                                </div>
                                <span className="text-xl">{activity.icon}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-text-muted bg-card-light rounded-xl border border-gray-100">
                            <span className="material-symbols-outlined text-4xl mb-2">pending_actions</span>
                            <p>No student activity yet</p>
                            <p className="text-xs mt-1">Activity will appear when students use the app</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
