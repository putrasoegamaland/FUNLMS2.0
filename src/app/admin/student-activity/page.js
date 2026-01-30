'use client';

import { useState, useMemo } from 'react';
import { useStudentActivity, useUsers, useClasses, useEnrollments } from '@/hooks/useSupabaseData';

export default function AdminStudentActivityPage() {
    const { data: activities, loading } = useStudentActivity();
    const { data: allStudents } = useUsers({ role: 'student' });
    const { data: allClasses } = useClasses();
    const { data: enrollments } = useEnrollments();

    const [filterStudent, setFilterStudent] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterType, setFilterType] = useState('');
    const [dateRange, setDateRange] = useState('all');

    // Get students in a class
    const studentsInClass = useMemo(() => {
        if (!filterClass) return [];
        return enrollments?.filter(e => e.class_id === filterClass).map(e => e.student_id) || [];
    }, [filterClass, enrollments]);

    // Filter activities
    const filteredActivities = useMemo(() => {
        let data = activities || [];

        if (filterStudent) {
            data = data.filter(a => a.student_id === filterStudent);
        }

        if (filterClass && studentsInClass.length > 0) {
            data = data.filter(a => studentsInClass.includes(a.student_id));
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
    }, [activities, filterStudent, filterClass, studentsInClass, filterType, dateRange]);

    // Activity stats
    const activityStats = useMemo(() => {
        const stats = {
            total: activities?.length || 0,
            today: 0,
            quizzes: 0,
            books: 0,
            videos: 0,
            games: 0,
            byStudent: {},
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        (activities || []).forEach(a => {
            if (new Date(a.created_at) >= today) stats.today++;
            if (a.activity_type === 'quiz_completed') stats.quizzes++;
            if (a.activity_type === 'book_read') stats.books++;
            if (a.activity_type === 'video_watched') stats.videos++;
            if (a.activity_type === 'game_played') stats.games++;

            if (!stats.byStudent[a.student_id]) {
                stats.byStudent[a.student_id] = { count: 0, lastActive: null };
            }
            stats.byStudent[a.student_id].count++;
            if (!stats.byStudent[a.student_id].lastActive || new Date(a.created_at) > new Date(stats.byStudent[a.student_id].lastActive)) {
                stats.byStudent[a.student_id].lastActive = a.created_at;
            }
        });

        return stats;
    }, [activities]);

    const getStudentName = (studentId) => {
        const student = allStudents?.find(u => u.id === studentId);
        return student?.name || 'Unknown Student';
    };

    const getStudentAvatar = (studentId) => {
        const student = allStudents?.find(u => u.id === studentId);
        return student?.avatar || '👤';
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'quiz_completed': return '📝';
            case 'book_read': return '📚';
            case 'video_watched': return '🎬';
            case 'game_played': return '🎮';
            case 'assignment_submitted': return '📋';
            case 'login': return '🔐';
            default: return '📌';
        }
    };

    const getActivityLabel = (type) => {
        switch (type) {
            case 'quiz_completed': return 'Completed Quiz';
            case 'book_read': return 'Read Book';
            case 'video_watched': return 'Watched Video';
            case 'game_played': return 'Played Game';
            case 'assignment_submitted': return 'Submitted Assignment';
            case 'login': return 'Logged In';
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
                    <p className="text-gray-500">Loading student activity...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">👨‍🎓 Student Activity</h1>
                <p className="text-gray-500">Monitor student learning activities</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-blue-600">{activityStats.total}</p>
                    <p className="text-xs text-blue-700">Total Activities</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-green-600">{activityStats.today}</p>
                    <p className="text-xs text-green-700">Today</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-purple-600">{activityStats.quizzes}</p>
                    <p className="text-xs text-purple-700">Quizzes Done</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-orange-600">{activityStats.books}</p>
                    <p className="text-xs text-orange-700">Books Read</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-pink-600">{activityStats.games}</p>
                    <p className="text-xs text-pink-700">Games Played</p>
                </div>
            </div>

            {/* Student Cards */}
            <div className="bg-white rounded-xl border p-4">
                <h3 className="font-bold text-gray-900 mb-3">Students Overview</h3>
                <div className="flex flex-wrap gap-3">
                    {Object.entries(activityStats.byStudent)
                        .sort((a, b) => new Date(b[1].lastActive) - new Date(a[1].lastActive))
                        .map(([studentId, stats]) => (
                            <button
                                key={studentId}
                                onClick={() => setFilterStudent(filterStudent === studentId ? '' : studentId)}
                                className={`p-3 rounded-xl text-left transition-colors flex items-center gap-2 ${filterStudent === studentId
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="text-2xl">{getStudentAvatar(studentId)}</span>
                                <div>
                                    <p className={`font-medium text-sm ${filterStudent === studentId ? 'text-white' : 'text-gray-900'}`}>
                                        {getStudentName(studentId)}
                                    </p>
                                    <p className={`text-xs ${filterStudent === studentId ? 'text-blue-100' : 'text-gray-500'}`}>
                                        {stats.count} activities • {getRelativeTime(stats.lastActive)}
                                    </p>
                                </div>
                            </button>
                        ))}
                    {Object.keys(activityStats.byStudent).length === 0 && (
                        <p className="text-gray-400 text-sm">No student activity yet</p>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex flex-wrap gap-3">
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white text-sm"
                    >
                        <option value="">All Classes</option>
                        {allClasses?.map(c => (
                            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                        ))}
                    </select>

                    <select
                        value={filterStudent}
                        onChange={(e) => setFilterStudent(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white text-sm"
                    >
                        <option value="">All Students</option>
                        {allStudents?.map(s => (
                            <option key={s.id} value={s.id}>{s.avatar} {s.name}</option>
                        ))}
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white text-sm"
                    >
                        <option value="">All Activities</option>
                        <option value="quiz_completed">📝 Quiz Completed</option>
                        <option value="book_read">📚 Book Read</option>
                        <option value="video_watched">🎬 Video Watched</option>
                        <option value="game_played">🎮 Game Played</option>
                        <option value="assignment_submitted">📋 Assignment</option>
                        <option value="login">🔐 Login</option>
                    </select>

                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white text-sm"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>

                    {(filterStudent || filterClass || filterType || dateRange !== 'all') && (
                        <button
                            onClick={() => {
                                setFilterStudent('');
                                setFilterClass('');
                                setFilterType('');
                                setDateRange('all');
                            }}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
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
                            ? 'Student activities will appear here as they use the app'
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
                                {/* Student Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                                    {getStudentAvatar(activity.student_id)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-gray-900">
                                            {getStudentName(activity.student_id)}
                                        </span>
                                        <span className="text-xl">{getActivityIcon(activity.activity_type)}</span>
                                        <span className="text-gray-500 text-sm">
                                            {getActivityLabel(activity.activity_type).toLowerCase()}
                                        </span>
                                    </div>

                                    {activity.entity_title && (
                                        <p className="text-gray-700 mt-0.5 font-medium">
                                            "{activity.entity_title}"
                                        </p>
                                    )}

                                    {/* Metadata */}
                                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {activity.metadata.score !== undefined && (
                                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                                    Score: {activity.metadata.score}%
                                                </span>
                                            )}
                                            {activity.metadata.correctAnswers !== undefined && (
                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                                    {activity.metadata.correctAnswers}/{activity.metadata.totalQuestions} correct
                                                </span>
                                            )}
                                            {activity.metadata.timeSpent !== undefined && (
                                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                    {Math.round(activity.metadata.timeSpent / 60)}min
                                                </span>
                                            )}
                                            {activity.metadata.xpEarned !== undefined && (
                                                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                                                    +{activity.metadata.xpEarned} XP
                                                </span>
                                            )}
                                            {activity.metadata.level !== undefined && (
                                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                                    Level {activity.metadata.level}
                                                </span>
                                            )}
                                            {activity.metadata.streak !== undefined && (
                                                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                                    🔥 {activity.metadata.streak} day streak
                                                </span>
                                            )}
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
