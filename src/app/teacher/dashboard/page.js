'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import storage from '@/lib/storage';

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
    const [stats, setStats] = useState({ classes: 0, studentsPresent: 0, totalStudents: 0, booksUploaded: 0 });
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        const classes = storage.classes.getAll();
        const books = storage.books.getAll();
        const enrollments = storage.enrollments.getAll();

        // Calculate real student count from enrollments
        const totalStudents = new Set(enrollments.map(e => e.studentId)).size;

        setStats({
            classes: classes.length,
            studentsPresent: totalStudents, // Real enrolled students
            totalStudents: totalStudents,
            booksUploaded: books.length,
        });

        // Load real recent activity from attempts
        const attempts = storage.attempts?.getAll?.() || [];
        const recentAttempts = attempts
            .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
            .slice(0, 5)
            .map((attempt, i) => {
                const student = storage.users.getById(attempt.studentId);
                const quiz = storage.assessments.getById(attempt.assessmentId);
                const timeAgo = getTimeAgo(attempt.completedAt || attempt.createdAt);
                return {
                    id: attempt.id || i,
                    icon: '✅',
                    title: `${student?.name || 'Student'} completed`,
                    highlight: quiz?.title || 'a quiz',
                    desc: timeAgo,
                    color: 'green'
                };
            });
        setRecentActivity(recentAttempts.length > 0 ? recentAttempts : []);
    }, []);

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
                            <span className="text-xs text-text-muted">92%</span>
                        </div>
                        <p className="text-2xl font-bold text-text-main">{stats.studentsPresent}/{stats.totalStudents}</p>
                        <p className="text-xs text-text-muted">Students Present</p>
                    </div>
                    <div className="bg-background-light rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 20 }}>menu_book</span>
                            <span className="text-xs text-green-600">+2</span>
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

            {/* Recent Activity */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-text-main font-bold">{t('recent_activity')}</h3>
                    <button className="text-primary text-sm font-semibold">{t('view_all')}</button>
                </div>
                <div className="space-y-3">
                    {recentActivity.map(activity => (
                        <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl bg-card-light border border-gray-100 shadow-sm">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                                {activity.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-text-main">
                                    <span className="font-bold">{activity.title}</span>
                                    {activity.highlight && <span className="text-primary font-bold"> {activity.highlight}</span>}
                                </p>
                                <p className="text-xs text-text-muted">{activity.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
