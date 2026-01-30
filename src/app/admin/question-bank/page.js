'use client';

import { useState, useMemo } from 'react';
import { useQuestionBank, useSubjects, useUsers } from '@/hooks/useSupabaseData';

export default function AdminQuestionBankPage() {
    const { data: allQuestions, loading } = useQuestionBank();
    const { data: subjects } = useSubjects();
    const { data: allUsers } = useUsers({ role: 'teacher' });

    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [filterTeacher, setFilterTeacher] = useState('');
    const [sortBy, setSortBy] = useState('created_at');

    // Filter and sort questions
    const filteredQuestions = useMemo(() => {
        let questions = allQuestions || [];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            questions = questions.filter(q =>
                q.prompt?.toLowerCase().includes(query) ||
                q.tags?.some(t => t.toLowerCase().includes(query))
            );
        }

        if (filterSubject) {
            questions = questions.filter(q => q.subject_id === filterSubject);
        }
        if (filterType) {
            questions = questions.filter(q => q.type === filterType);
        }
        if (filterDifficulty) {
            questions = questions.filter(q => q.difficulty === filterDifficulty);
        }
        if (filterTeacher) {
            questions = questions.filter(q => q.teacher_id === filterTeacher);
        }

        // Sort
        questions.sort((a, b) => {
            if (sortBy === 'created_at') {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            if (sortBy === 'times_used') {
                return (b.times_used || 0) - (a.times_used || 0);
            }
            return 0;
        });

        return questions;
    }, [allQuestions, searchQuery, filterSubject, filterType, filterDifficulty, filterTeacher, sortBy]);

    // Stats per teacher
    const teacherStats = useMemo(() => {
        const stats = {};
        (allQuestions || []).forEach(q => {
            if (!stats[q.teacher_id]) {
                stats[q.teacher_id] = { count: 0, lastCreated: null };
            }
            stats[q.teacher_id].count++;
            if (!stats[q.teacher_id].lastCreated || new Date(q.created_at) > new Date(stats[q.teacher_id].lastCreated)) {
                stats[q.teacher_id].lastCreated = q.created_at;
            }
        });
        return stats;
    }, [allQuestions]);

    const getTeacherName = (teacherId) => {
        const teacher = allUsers?.find(u => u.id === teacherId);
        return teacher?.name || 'Unknown Teacher';
    };

    const getSubjectName = (subjectId) => {
        const subject = subjects?.find(s => s.id === subjectId);
        return subject ? `${subject.emoji} ${subject.name}` : '';
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'mc': return '📝';
            case 'essay': return '✏️';
            case 'drawing': return '🎨';
            case 'fill_blank': return '📋';
            case 'true_false': return '✅';
            default: return '❓';
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'mc': return 'Multiple Choice';
            case 'essay': return 'Essay';
            case 'drawing': return 'Drawing';
            case 'fill_blank': return 'Fill in Blank';
            case 'true_false': return 'True/False';
            default: return type;
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-100 text-green-700';
            case 'medium': return 'bg-yellow-100 text-yellow-700';
            case 'hard': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading question bank...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">📚 All Teachers' Questions</h1>
                <p className="text-gray-500">Monitor and review questions created by teachers</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-blue-600">{allQuestions?.length || 0}</p>
                    <p className="text-sm text-blue-700">Total Questions</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-green-600">
                        {Object.keys(teacherStats).length}
                    </p>
                    <p className="text-sm text-green-700">Active Teachers</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-purple-600">
                        {allQuestions?.filter(q => q.type === 'mc').length || 0}
                    </p>
                    <p className="text-sm text-purple-700">Multiple Choice</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-orange-600">
                        {allQuestions?.reduce((sum, q) => sum + (q.times_used || 0), 0)}
                    </p>
                    <p className="text-sm text-orange-700">Total Usage</p>
                </div>
            </div>

            {/* Teacher Summary Cards */}
            <div className="bg-white rounded-xl border p-4">
                <h3 className="font-bold text-gray-900 mb-3">Questions by Teacher</h3>
                <div className="flex flex-wrap gap-3">
                    {Object.entries(teacherStats).map(([teacherId, stats]) => (
                        <button
                            key={teacherId}
                            onClick={() => setFilterTeacher(filterTeacher === teacherId ? '' : teacherId)}
                            className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${filterTeacher === teacherId
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <span className="font-medium">{getTeacherName(teacherId)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${filterTeacher === teacherId
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                {stats.count}
                            </span>
                        </button>
                    ))}
                    {Object.keys(teacherStats).length === 0 && (
                        <p className="text-gray-400 text-sm">No teachers have created questions yet</p>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex flex-wrap gap-3">
                    {/* Search */}
                    <div className="flex-1 min-w-[250px]">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search questions..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white"
                            />
                        </div>
                    </div>

                    <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white"
                    >
                        <option value="">All Subjects</option>
                        {subjects?.map(s => (
                            <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                        ))}
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white"
                    >
                        <option value="">All Types</option>
                        <option value="mc">📝 Multiple Choice</option>
                        <option value="essay">✏️ Essay</option>
                        <option value="fill_blank">📋 Fill in Blank</option>
                        <option value="true_false">✅ True/False</option>
                    </select>

                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white"
                    >
                        <option value="">All Difficulty</option>
                        <option value="easy">🟢 Easy</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="hard">🔴 Hard</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white"
                    >
                        <option value="created_at">Newest First</option>
                        <option value="times_used">Most Used</option>
                    </select>

                    {filterTeacher && (
                        <button
                            onClick={() => setFilterTeacher('')}
                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-1"
                        >
                            <span>{getTeacherName(filterTeacher)}</span>
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Question List */}
            {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-2">inventory_2</span>
                    <p className="text-gray-500">No questions found</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {allQuestions?.length === 0
                            ? 'Teachers haven\'t created any questions yet'
                            : 'Try adjusting your filters'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-gray-500">{filteredQuestions.length} questions</p>

                    {filteredQuestions.map((question) => (
                        <div
                            key={question.id}
                            className="bg-white rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    {/* Teacher badge */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-gray-400 text-sm">person</span>
                                        <span className="text-sm font-medium text-gray-700">
                                            {getTeacherName(question.teacher_id)}
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(question.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {/* Type badges */}
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-lg">{getTypeIcon(question.type)}</span>
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                            {getTypeLabel(question.type)}
                                        </span>
                                        {question.difficulty && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(question.difficulty)}`}>
                                                {question.difficulty}
                                            </span>
                                        )}
                                        {question.subject_id && (
                                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                {getSubjectName(question.subject_id)}
                                            </span>
                                        )}
                                        {question.times_used > 0 && (
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                Used {question.times_used}x
                                            </span>
                                        )}
                                    </div>

                                    {/* Question text */}
                                    <p className="font-medium text-gray-900">{question.prompt}</p>

                                    {/* Options for MC */}
                                    {question.type === 'mc' && question.options && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {question.options.map((opt, i) => (
                                                <span
                                                    key={opt.id || i}
                                                    className={`text-xs px-2 py-1 rounded ${opt.isCorrect
                                                            ? 'bg-green-100 text-green-700 font-medium'
                                                            : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                >
                                                    {String.fromCharCode(65 + i)}. {opt.text?.slice(0, 40)}{opt.text?.length > 40 ? '...' : ''}
                                                    {opt.isCorrect && ' ✓'}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {question.tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {question.tags.map((tag, i) => (
                                                <span key={i} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Source */}
                                    {question.source && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Source: {question.source}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
