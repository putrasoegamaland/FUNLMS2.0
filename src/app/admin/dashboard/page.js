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

export default function AdminDashboard() {
    const { t } = useLanguage();
    const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0 });
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        // Load stats
        const users = storage.users.getAll();
        const classes = storage.classes.getAll();

        setStats({
            students: users.filter(u => u.role === 'student').length,
            teachers: users.filter(u => u.role === 'teacher').length,
            classes: classes.length,
        });

        // Load real recent activity from attempts and submissions
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
                    type: 'quiz',
                    icon: 'quiz',
                    title: student?.name || 'Student',
                    desc: `Completed ${quiz?.title || 'a quiz'}`,
                    time: timeAgo,
                    color: 'green'
                };
            });
        setRecentActivity(recentAttempts.length > 0 ? recentAttempts : []);
    }, []);

    return (
        <div className="p-4 space-y-6">
            {/* Stats Cards */}
            <section className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                <StatCard
                    icon="school"
                    label={t('total_students')}
                    value={stats.students}
                    trend="+5%"
                    color="primary"
                />
                <StatCard
                    icon="cast_for_education"
                    label={t('total_teachers')}
                    value={stats.teachers}
                    trend="+2%"
                    color="purple"
                />
                <StatCard
                    icon="class"
                    label={t('active_classes')}
                    value={stats.classes}
                    trend="0%"
                    color="orange"
                />
            </section>

            {/* Quick Actions */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-text-main font-bold">{t('quick_actions')}</h3>
                    <button className="text-primary text-sm font-semibold">{t('edit')}</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <ActionCard
                        href="/admin/users"
                        title="Manage Users"
                        icon="group"
                        bgImage="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400"
                    />
                    <ActionCard
                        href="/admin/classes"
                        title="Manage Classes"
                        icon="meeting_room"
                        bgImage="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <button className="flex items-center gap-3 p-4 rounded-xl bg-card-light border border-gray-100 shadow-sm active:bg-gray-50 transition-colors">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 20 }}>bar_chart</span>
                        </div>
                        <span className="font-bold text-sm text-text-main">Reports</span>
                    </button>
                    <button className="flex items-center gap-3 p-4 rounded-xl bg-card-light border border-gray-100 shadow-sm active:bg-gray-50 transition-colors">
                        <div className="bg-gray-100 p-2 rounded-lg">
                            <span className="material-symbols-outlined text-gray-600" style={{ fontSize: 20 }}>settings</span>
                        </div>
                        <span className="font-bold text-sm text-text-main">{t('settings')}</span>
                    </button>
                </div>
            </section>

            {/* Recent Activity */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-text-main font-bold">{t('recent_activity')}</h3>
                    <button className="text-primary text-sm font-semibold">{t('view_all')}</button>
                </div>
                <div className="space-y-3">
                    {recentActivity.map(activity => (
                        <ActivityItem key={activity.id} {...activity} />
                    ))}
                </div>
            </section>
        </div>
    );
}

function StatCard({ icon, label, value, trend, color }) {
    const colorClasses = {
        primary: 'bg-primary/10 text-primary',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600',
    };

    return (
        <div className="min-w-[150px] flex-1 p-4 rounded-xl bg-card-light shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}>
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <p className="text-text-muted text-sm font-medium">{label}</p>
            <p className="text-3xl font-bold text-text-main mt-1">{value}</p>
            <span className="text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded mt-2 inline-block">
                {trend}
            </span>
        </div>
    );
}

function ActionCard({ href, title, icon, bgImage }) {
    return (
        <a
            href={href}
            className="group relative flex flex-col justify-end p-4 h-32 rounded-2xl overflow-hidden bg-card-light shadow-sm active:scale-[0.98] transition-all"
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url('${bgImage}')` }}
            />
            <div className="relative z-20 flex flex-col items-start gap-1">
                <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg mb-1">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>{icon}</span>
                </div>
                <span className="text-white font-bold text-base">{title}</span>
            </div>
        </a>
    );
}

function ActivityItem({ icon, title, desc, time, color }) {
    const colorClasses = {
        orange: 'bg-orange-100 text-orange-600',
        blue: 'bg-blue-100 text-blue-600',
        gray: 'bg-gray-100 text-gray-600',
        green: 'bg-green-100 text-green-600',
    };

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card-light border border-gray-100 shadow-sm">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-main truncate">{title}</p>
                <p className="text-xs text-text-muted truncate">{desc}</p>
            </div>
            <span className="text-xs font-medium text-text-muted whitespace-nowrap">{time}</span>
        </div>
    );
}
