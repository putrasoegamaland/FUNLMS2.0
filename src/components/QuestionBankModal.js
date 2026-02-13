'use client';

import { useState, useMemo } from 'react';
import { useQuestionBank, useSubjects, useUsers } from '@/hooks/useSupabaseData';

/**
 * Question Bank Modal
 * Allows teachers to browse and import questions from their bank
 * Admins can view all teachers' questions
 */
export default function QuestionBankModal({ onImportQuestions, onClose, isAdmin = false, currentTeacherId }) {
    const { data: allQuestions, loading: questionsLoading } = useQuestionBank();
    const { data: subjects } = useSubjects();
    const { data: users } = useUsers({ role: 'teacher' });

    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [filterTeacher, setFilterTeacher] = useState('');
    const [selectedQuestions, setSelectedQuestions] = useState([]);

    // Filter questions based on permissions and filters
    const filteredQuestions = useMemo(() => {
        let questions = allQuestions || [];

        // If not admin, only show own questions
        if (!isAdmin && currentTeacherId) {
            questions = questions.filter(q => q.teacher_id === currentTeacherId);
        }

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            questions = questions.filter(q =>
                q.prompt?.toLowerCase().includes(query) ||
                q.tags?.some(t => t.toLowerCase().includes(query))
            );
        }

        // Apply filters
        if (filterSubject) {
            questions = questions.filter(q => q.subject_id === filterSubject);
        }
        if (filterType) {
            questions = questions.filter(q => q.type === filterType);
        }
        if (filterDifficulty) {
            questions = questions.filter(q => q.difficulty === filterDifficulty);
        }
        if (filterTeacher && isAdmin) {
            questions = questions.filter(q => q.teacher_id === filterTeacher);
        }

        return questions;
    }, [allQuestions, isAdmin, currentTeacherId, searchQuery, filterSubject, filterType, filterDifficulty, filterTeacher]);

    const getTeacherName = (teacherId) => {
        const teacher = users?.find(u => u.id === teacherId);
        return teacher?.name || 'Unknown Teacher';
    };

    const getSubjectName = (subjectId) => {
        const subject = subjects?.find(s => s.id === subjectId);
        return subject?.name || '';
    };

    const toggleQuestionSelection = (questionId) => {
        setSelectedQuestions(prev =>
            prev.includes(questionId)
                ? prev.filter(id => id !== questionId)
                : [...prev, questionId]
        );
    };

    const selectAll = () => {
        if (selectedQuestions.length === filteredQuestions.length) {
            setSelectedQuestions([]);
        } else {
            setSelectedQuestions(filteredQuestions.map(q => q.id));
        }
    };

    const handleImport = () => {
        const questionsToImport = allQuestions.filter(q => selectedQuestions.includes(q.id));
        // Format questions for quiz import
        const formattedQuestions = questionsToImport.map(q => ({
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); })), // New ID for the imported question
            type: q.type,
            prompt: q.prompt,
            promptImage: q.prompt_image,
            options: q.options || [],
            correctAnswer: q.correct_answer,
        }));
        onImportQuestions(formattedQuestions);
        onClose();
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

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Question Bank</h2>
                            <p className="text-sm text-gray-500">
                                {isAdmin ? 'View all teachers\' questions' : 'Browse and import your saved questions'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 bg-gray-50 border-b">
                    <div className="flex flex-wrap gap-3">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search questions..."
                                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        {/* Subject filter */}
                        <select
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm bg-white"
                        >
                            <option value="">All Subjects</option>
                            {subjects?.map(s => (
                                <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                            ))}
                        </select>

                        {/* Type filter */}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm bg-white"
                        >
                            <option value="">All Types</option>
                            <option value="mc">📝 Multiple Choice</option>
                            <option value="essay">✏️ Essay</option>
                            <option value="fill_blank">📋 Fill in Blank</option>
                            <option value="true_false">✅ True/False</option>
                            <option value="drawing">🎨 Drawing</option>
                        </select>

                        {/* Difficulty filter */}
                        <select
                            value={filterDifficulty}
                            onChange={(e) => setFilterDifficulty(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm bg-white"
                        >
                            <option value="">All Difficulty</option>
                            <option value="easy">🟢 Easy</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="hard">🔴 Hard</option>
                        </select>

                        {/* Teacher filter (admin only) */}
                        {isAdmin && (
                            <select
                                value={filterTeacher}
                                onChange={(e) => setFilterTeacher(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm bg-white"
                            >
                                <option value="">All Teachers</option>
                                {users?.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Question List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {questionsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-6xl text-gray-300 mb-2">inventory_2</span>
                            <p className="text-gray-500">No questions found</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {allQuestions?.length === 0
                                    ? 'Start building your question bank by saving questions from quizzes'
                                    : 'Try adjusting your filters'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Select all */}
                            {!isAdmin && (
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <input
                                        type="checkbox"
                                        checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                                        onChange={selectAll}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm text-gray-600">
                                        {selectedQuestions.length > 0
                                            ? `${selectedQuestions.length} selected`
                                            : 'Select all'}
                                    </span>
                                </div>
                            )}

                            {/* Questions */}
                            {filteredQuestions.map((question) => (
                                <div
                                    key={question.id}
                                    className={`bg-gray-50 rounded-xl p-4 border transition-colors ${selectedQuestions.includes(question.id)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-transparent hover:border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Checkbox (for import mode) */}
                                        {!isAdmin && (
                                            <input
                                                type="checkbox"
                                                checked={selectedQuestions.includes(question.id)}
                                                onChange={() => toggleQuestionSelection(question.id)}
                                                className="w-4 h-4 rounded mt-1"
                                            />
                                        )}

                                        {/* Question content */}
                                        <div className="flex-1">
                                            {/* Badges row */}
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
                                                    <span className="text-xs text-gray-400">
                                                        Used {question.times_used}x
                                                    </span>
                                                )}
                                            </div>

                                            {/* Question prompt */}
                                            <p className="font-medium text-sm mb-2">{question.prompt}</p>

                                            {/* Options preview for MC */}
                                            {question.type === 'mc' && question.options && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {question.options.slice(0, 4).map((opt, i) => (
                                                        <span
                                                            key={opt.id || i}
                                                            className={`text-xs px-2 py-1 rounded ${opt.isCorrect
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                                }`}
                                                        >
                                                            {String.fromCharCode(65 + i)}. {opt.text?.slice(0, 30)}{opt.text?.length > 30 ? '...' : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Tags */}
                                            {question.tags?.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {question.tags.map((tag, i) => (
                                                        <span key={i} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Teacher info (admin view) */}
                                            {isAdmin && (
                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t text-xs text-gray-500">
                                                    <span className="material-symbols-outlined text-sm">person</span>
                                                    <span>{getTeacherName(question.teacher_id)}</span>
                                                    <span>•</span>
                                                    <span>{new Date(question.created_at).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                    <div className="text-sm text-gray-500">
                        {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} found
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                        >
                            {isAdmin ? 'Close' : 'Cancel'}
                        </button>

                        {!isAdmin && (
                            <button
                                onClick={handleImport}
                                disabled={selectedQuestions.length === 0}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Import {selectedQuestions.length > 0 ? `(${selectedQuestions.length})` : ''}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
