'use client';

import { useState, useMemo } from 'react';
import { useStudentActivity, useTeacherActivity, useUsers } from '@/hooks/useSupabaseData';

export default function AdminActivityPage() {
    const { data: studentActivities, loading: studentLoading } = useStudentActivity();
    const { data: teacherActivities, loading: teacherLoading } = useTeacherActivity();
    const { data: allUsers } = useUsers();

    const [activeTab, setActiveTab] = useState('all'); // 'all', 'students', 'teachers'
    const [filterType, setFilterType] = useState('');
    const [dateRange, setDateRange] = useState('all');

    const loading = studentLoading || teacherLoading;

    // Combine and process activities
    const allActivities = useMemo(() => {
        const combined = [];

        // Student activities
        (studentActivities || []).forEach(a => {
            const user = allUsers?.find(u => u.id === a.student_id);
            combined.push({
                ...a,
                actorType: 'student',
                actorName: user?.name || 'Student',
                actorAvatar: user?.avatar || '👤',
            });
        });

        // Teacher activities
        (teacherActivities || []).forEach(a => {
            const user = allUsers?.find(u => u.id === a.teacher_id);
            combined.push({
                ...a,
                actorType: 'teacher',
                actorName: user?.name || 'Teacher',
                actorAvatar: user?.avatar || '👩‍🏫',
            });
        });

        // Sort by date
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return combined;
    }, [studentActivities, teacherActivities, allUsers]);

    // Filter activities
    const filteredActivities = useMemo(() => {
        let data = allActivities;

        if (activeTab === 'students') {
            data = data.filter(a => a.actorType === 'student');
        } else if (activeTab === 'teachers') {
            data = data.filter(a => a.actorType === 'teacher');
        }

        if (filterType) {
            data = data.filter(a => a.activity_type === filterType);
        }

        // Date filter
        const now = new Date();
        if (dateRange === 'today') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            data = data.filter(a => new Date(a.created_at) >= today);
        } else if (dateRange === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            data = data.filter(a => new Date(a.created_at) >= weekAgo);
        }

        return data;
    }, [allActivities, activeTab, filterType, dateRange]);

    // Stats
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
            total: allActivities.length,
            today: allActivities.filter(a => new Date(a.created_at) >= today).length,
            students: allActivities.filter(a => a.actorType === 'student').length,
            teachers: allActivities.filter(a => a.actorType === 'teacher').length,
        };
    }, [allActivities]);

    const getActivityIcon = (type) => {
        const icons = {
            quiz_completed: '📝', book_read: '📚', video_watched: '🎬',
            game_played: '🎮', assignment_submitted: '📋', login: '🔐',
            create_quiz: '✏️', grade_submission: '✅', add_question: '➕',
            create_assignment: '📄', upload_book: '📖',
        };
        return icons[type] || '📌';
    };

    const getActivityLabel = (type) => {
        const labels = {
            quiz_completed: 'completed quiz', book_read: 'read book',
            video_watched: 'watched video', game_played: 'played game',
            assignment_submitted: 'submitted assignment', login: 'logged in',
            create_quiz: 'created quiz', grade_submission: 'graded',
            add_question: 'added question', create_assignment: 'created assignment',
            upload_book: 'uploaded book',
        };
        return labels[type] || type?.replace(/_/g, ' ');
    };

    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading activity...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">📊 Activity Monitor</h1>
                <p className="text-gray-500 text-sm">Track all user activities</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 md:gap-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-lg md:text-2xl font-bold text-blue-600">{stats.total}</p>
                    <p className="text-xs text-blue-700">Total</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-lg md:text-2xl font-bold text-green-600">{stats.today}</p>
                    <p className="text-xs text-green-700">Today</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-lg md:text-2xl font-bold text-purple-600">{stats.students}</p>
                    <p className="text-xs text-purple-700">Students</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-lg md:text-2xl font-bold text-orange-600">{stats.teachers}</p>
                    <p className="text-xs text-orange-700">Teachers</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                {[
                    { id: 'all', label: 'All', icon: '📊' },
                    { id: 'students', label: 'Students', icon: '👨‍🎓' },
                    { id: 'teachers', label: 'Teachers', icon: '👩‍🏫' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-white text-gray-900 shadow'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <span className="mr-1">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white text-sm flex-1 min-w-[120px]"
                >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                </select>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white text-sm flex-1 min-w-[120px]"
                >
                    <option value="">All Types</option>
                    <option value="quiz_completed">Quiz Completed</option>
                    <option value="book_read">Book Read</option>
                    <option value="create_quiz">Quiz Created</option>
                    <option value="grade_submission">Graded</option>
                </select>
            </div>

            {/* Activity List */}
            {filteredActivities.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                    <span className="text-5xl mb-2">📭</span>
                    <p className="text-gray-500 mt-2">No activities found</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border divide-y">
                    {filteredActivities.slice(0, 50).map((activity) => (
                        <div key={activity.id} className="p-3 hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${activity.actorType === 'teacher' ? 'bg-blue-100' : 'bg-green-100'
                                    }`}>
                                    {activity.actorAvatar}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm">
                                        <span className="font-medium text-gray-900">{activity.actorName}</span>
                                        <span className="text-gray-500"> {getActivityLabel(activity.activity_type)}</span>
                                    </p>
                                    {activity.entity_title && (
                                        <p className="text-xs text-primary font-medium truncate">{activity.entity_title}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activity.actorType === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {activity.actorType}
                                        </span>
                                        <span className="text-xs text-gray-400">{getRelativeTime(activity.created_at)}</span>
                                    </div>
                                </div>

                                {/* Icon */}
                                <span className="text-xl">{getActivityIcon(activity.activity_type)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
