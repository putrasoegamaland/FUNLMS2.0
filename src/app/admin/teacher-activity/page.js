'use client';

import { useState, useMemo } from 'react';
import { useTeacherActivity, useUsers } from '@/hooks/useSupabaseData';

export default function AdminTeacherActivityPage() {
    const { data: activities, loading } = useTeacherActivity();
    const { data: allUsersRaw } = useUsers(); // Fetch ALL users
    const allUsers = useMemo(() => {
        return allUsersRaw?.filter(u => u.role === 'teacher' || u.role === 'Teacher') || [];
    }, [allUsersRaw]);

    const [filterTeacher, setFilterTeacher] = useState('');
    const [filterType, setFilterType] = useState('');
    const [dateRange, setDateRange] = useState('all'); // all, today, week, month

    // Filter activities
    const filteredActivities = useMemo(() => {
        let data = activities || [];

        if (filterTeacher) {
            data = data.filter(a => a.teacher_id === filterTeacher);
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
        } else if (dateRange === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            data = data.filter(a => new Date(a.created_at) >= monthAgo);
        }

        // Sort by most recent
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return data;
    }, [activities, filterTeacher, filterType, dateRange]);

    // Activity stats
    const activityStats = useMemo(() => {
        const stats = {
            total: activities?.length || 0,
            today: 0,
            byTeacher: {},
            byType: {},
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        (activities || []).forEach(a => {
            // Today
            if (new Date(a.created_at) >= today) {
                stats.today++;
            }

            // By teacher
            if (!stats.byTeacher[a.teacher_id]) {
                stats.byTeacher[a.teacher_id] = { count: 0, lastActive: null };
            }
            stats.byTeacher[a.teacher_id].count++;
            if (!stats.byTeacher[a.teacher_id].lastActive || new Date(a.created_at) > new Date(stats.byTeacher[a.teacher_id].lastActive)) {
                stats.byTeacher[a.teacher_id].lastActive = a.created_at;
            }

            // By type
            stats.byType[a.activity_type] = (stats.byType[a.activity_type] || 0) + 1;
        });

        return stats;
    }, [activities]);

    const getTeacherName = (teacherId) => {
        const teacher = allUsers?.find(u => u.id === teacherId);
        return teacher?.name || 'Unknown Teacher';
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'create_quiz': return '📝';
            case 'create_assignment': return '📋';
            case 'grade_submission': return '✅';
            case 'add_question': return '❓';
            case 'delete_question': return '🗑️';
            case 'create_class': return '🏫';
            case 'upload_book': return '📚';
            case 'upload_video': return '🎬';
            default: return '📌';
        }
    };

    const getActivityLabel = (type) => {
        switch (type) {
            case 'create_quiz': return 'Created Quiz';
            case 'create_assignment': return 'Created Assignment';
            case 'grade_submission': return 'Graded Submission';
            case 'add_question': return 'Added Question';
            case 'delete_question': return 'Deleted Question';
            case 'create_class': return 'Created Class';
            case 'upload_book': return 'Uploaded Book';
            case 'upload_video': return 'Uploaded Video';
            default: return type?.replace(/_/g, ' ') || 'Activity';
        }
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">📊 Teacher Activity</h1>
                <p className="text-gray-500">Monitor teacher actions and engagement</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-blue-600">{activityStats.total}</p>
                    <p className="text-sm text-blue-700">Total Activities</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-green-600">{activityStats.today}</p>
                    <p className="text-sm text-green-700">Today</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-purple-600">
                        {allUsers?.length || 0}
                    </p>
                    <p className="text-sm text-purple-700">Total Teachers</p>
                    <p className="text-xs text-purple-500 mt-1">
                        {Object.keys(activityStats.byTeacher).length} active recently
                    </p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-orange-600">
                        {Object.keys(activityStats.byType).length}
                    </p>
                    <p className="text-sm text-orange-700">Activity Types</p>
                </div>
            </div>

            {/* Teacher Cards */}
            <div className="bg-white rounded-xl border p-4">
                <h3 className="font-bold text-gray-900 mb-3">Teacher Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(allUsers || [])
                        .map(user => ({
                            user,
                            stats: activityStats.byTeacher[user.id] || { count: 0, lastActive: null }
                        }))
                        .sort((a, b) => {
                            if (a.stats.lastActive && b.stats.lastActive) return new Date(b.stats.lastActive) - new Date(a.stats.lastActive);
                            if (a.stats.lastActive) return -1;
                            if (b.stats.lastActive) return 1;
                            return 0;
                        })
                        .map(({ user, stats }) => (
                            <button
                                key={user.id}
                                onClick={() => setFilterTeacher(filterTeacher === user.id ? '' : user.id)}
                                className={`p-3 rounded-lg text-left transition-colors ${filterTeacher === user.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                            >
                                <p className={`font-medium ${filterTeacher === user.id ? 'text-white' : 'text-gray-900'}`}>
                                    {user.name}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className={`text-xs ${filterTeacher === user.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                        {stats.count} actions
                                    </span>
                                    {stats.lastActive && (
                                        <span className={`text-xs ${filterTeacher === user.id ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {getRelativeTime(stats.lastActive)}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    {(!allUsers || allUsers.length === 0) && (
                        <p className="text-gray-400 text-sm col-span-full">No teachers found</p>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex flex-wrap gap-3">
                    <select
                        value={filterTeacher}
                        onChange={(e) => setFilterTeacher(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white"
                    >
                        <option value="">All Teachers</option>
                        {allUsers?.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white"
                    >
                        <option value="">All Actions</option>
                        <option value="create_quiz">📝 Created Quiz</option>
                        <option value="create_assignment">📋 Created Assignment</option>
                        <option value="grade_submission">✅ Graded</option>
                        <option value="add_question">❓ Added Question</option>
                        <option value="upload_book">📚 Uploaded Book</option>
                        <option value="upload_video">🎬 Uploaded Video</option>
                    </select>

                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>

                    {(filterTeacher || filterType || dateRange !== 'all') && (
                        <button
                            onClick={() => {
                                setFilterTeacher('');
                                setFilterType('');
                                setDateRange('all');
                            }}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Activity Timeline */}
            {filteredActivities.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-2">history</span>
                    <p className="text-gray-500">No activities found</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {activities?.length === 0
                            ? 'Teacher activities will appear here once they start using the system'
                            : 'Try adjusting your filters'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border divide-y">
                    <p className="px-4 py-2 text-sm text-gray-500 bg-gray-50 rounded-t-xl">
                        {filteredActivities.length} activities
                    </p>

                    {filteredActivities.map((activity) => (
                        <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                                    {getActivityIcon(activity.activity_type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-gray-900">
                                            {getTeacherName(activity.teacher_id)}
                                        </span>
                                        <span className="text-gray-500">
                                            {getActivityLabel(activity.activity_type).toLowerCase()}
                                        </span>
                                    </div>

                                    {activity.entity_title && (
                                        <p className="text-gray-700 mt-0.5">
                                            "{activity.entity_title}"
                                        </p>
                                    )}

                                    {/* Metadata */}
                                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {Object.entries(activity.metadata).map(([key, value]) => (
                                                <span key={key} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                    {key}: {String(value)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Time */}
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm text-gray-500">
                                        {getRelativeTime(activity.created_at)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
