'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank, useSubjects, createRecord, updateRecord, deleteRecord } from '@/hooks/useSupabaseData';

export default function TeacherQuestionBankPage() {
    const { user } = useAuth();
    const { data: allQuestions, loading, refetch } = useQuestionBank({ teacher_id: user?.id });
    const { data: subjects } = useSubjects();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [selectedQuestions, setSelectedQuestions] = useState([]);

    // Filter questions
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

        return questions;
    }, [allQuestions, searchQuery, filterSubject, filterType, filterDifficulty]);

    const getSubjectName = (subjectId) => {
        const subject = subjects?.find(s => s.id === subjectId);
        return subject ? `${subject.emoji} ${subject.name}` : '';
    };

    const handleDelete = async (questionId) => {
        if (confirm('Delete this question from your bank?')) {
            try {
                await deleteRecord('question_bank', questionId);
                refetch();
            } catch (error) {
                alert('Error deleting: ' + error.message);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedQuestions.length === 0) return;
        if (!confirm(`Delete ${selectedQuestions.length} selected questions?`)) return;

        try {
            for (const id of selectedQuestions) {
                await deleteRecord('question_bank', id);
            }
            setSelectedQuestions([]);
            refetch();
        } catch (error) {
            alert('Error deleting: ' + error.message);
        }
    };

    const toggleSelect = (id) => {
        setSelectedQuestions(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedQuestions.length === filteredQuestions.length) {
            setSelectedQuestions([]);
        } else {
            setSelectedQuestions(filteredQuestions.map(q => q.id));
        }
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
            <div className="p-4 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading question bank...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-text-main">📚 Question Bank</h2>
                    <p className="text-sm text-text-muted">Save and reuse questions across quizzes</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Question
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{allQuestions?.length || 0}</p>
                    <p className="text-xs text-blue-700">Total</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                        {allQuestions?.filter(q => q.type === 'mc').length || 0}
                    </p>
                    <p className="text-xs text-green-700">Multiple Choice</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                        {allQuestions?.filter(q => q.type === 'essay').length || 0}
                    </p>
                    <p className="text-xs text-purple-700">Essay</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-orange-600">
                        {allQuestions?.reduce((sum, q) => sum + (q.times_used || 0), 0)}
                    </p>
                    <p className="text-xs text-orange-700">Times Used</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 rounded-xl p-4">
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
                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white"
                            />
                        </div>
                    </div>

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
                    </select>

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
                </div>
            </div>

            {/* Bulk actions */}
            {selectedQuestions.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                        {selectedQuestions.length} question{selectedQuestions.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
                    >
                        Delete Selected
                    </button>
                </div>
            )}

            {/* Question List */}
            {filteredQuestions.length === 0 ? (
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-2">inventory_2</span>
                    <p className="text-gray-500">No questions in your bank yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Create questions when making quizzes, or add them manually
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Select all */}
                    <div className="flex items-center gap-2 pb-2">
                        <input
                            type="checkbox"
                            checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                            onChange={selectAll}
                            className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-600">Select all ({filteredQuestions.length})</span>
                    </div>

                    {filteredQuestions.map((question) => (
                        <div
                            key={question.id}
                            className={`bg-white rounded-xl p-4 border group transition-colors ${selectedQuestions.includes(question.id)
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-100 hover:border-gray-200'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedQuestions.includes(question.id)}
                                    onChange={() => toggleSelect(question.id)}
                                    className="w-4 h-4 rounded mt-1"
                                />

                                <div className="flex-1">
                                    {/* Badges */}
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

                                    {/* Question text */}
                                    <p className="font-medium text-sm mb-2">{question.prompt}</p>

                                    {/* Options for MC */}
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
                                                    {String.fromCharCode(65 + i)}. {opt.text?.slice(0, 25)}{opt.text?.length > 25 ? '...' : ''}
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

                                    {/* Created date */}
                                    <p className="text-xs text-gray-400 mt-2">
                                        Created {new Date(question.created_at).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setEditingQuestion(question)}
                                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-500"
                                        title="Edit"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(question.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                                        title="Delete"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || editingQuestion) && (
                <QuestionModal
                    question={editingQuestion}
                    subjects={subjects}
                    teacherId={user?.id}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingQuestion(null);
                    }}
                    onSave={() => {
                        setShowAddModal(false);
                        setEditingQuestion(null);
                        refetch();
                    }}
                />
            )}
        </div>
    );
}

function QuestionModal({ question, subjects, teacherId, onClose, onSave }) {
    const [formData, setFormData] = useState({
        type: question?.type || 'mc',
        prompt: question?.prompt || '',
        options: question?.options || [
            { id: '1', text: '', isCorrect: false },
            { id: '2', text: '', isCorrect: false },
            { id: '3', text: '', isCorrect: false },
            { id: '4', text: '', isCorrect: false },
        ],
        correct_answer: question?.correct_answer || '',
        subject_id: question?.subject_id || '',
        difficulty: question?.difficulty || '',
        tags: question?.tags?.join(', ') || '',
        source: question?.source || '',
        explanation: question?.explanation || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!formData.prompt.trim()) {
            alert('Please enter a question');
            return;
        }

        setSaving(true);
        try {
            const data = {
                ...formData,
                teacher_id: teacherId,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            };

            if (question) {
                await updateRecord('question_bank', question.id, data);
            } else {
                await createRecord('question_bank', data);
            }

            onSave();
        } catch (error) {
            alert('Error saving: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const updateOption = (index, updates) => {
        setFormData(prev => ({
            ...prev,
            options: prev.options.map((opt, i) => i === index ? { ...opt, ...updates } : opt),
        }));
    };

    const setCorrectOption = (index) => {
        setFormData(prev => ({
            ...prev,
            options: prev.options.map((opt, i) => ({ ...opt, isCorrect: i === index })),
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="font-bold text-lg">
                        {question ? 'Edit Question' : 'Add Question'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Question Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="mc">📝 Multiple Choice</option>
                            <option value="essay">✏️ Essay</option>
                            <option value="fill_blank">📋 Fill in Blank</option>
                            <option value="true_false">✅ True/False</option>
                        </select>
                    </div>

                    {/* Question */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Question</label>
                        <textarea
                            value={formData.prompt}
                            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                            placeholder="Enter your question..."
                            rows={3}
                            className="w-full px-3 py-2 border rounded-lg resize-none"
                        />
                    </div>

                    {/* Options for MC */}
                    {formData.type === 'mc' && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Options (click to mark correct)</label>
                            <div className="space-y-2">
                                {formData.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCorrectOption(i)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${opt.isCorrect
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {String.fromCharCode(65 + i)}
                                        </button>
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={(e) => updateOption(i, { text: e.target.value })}
                                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                            className="flex-1 px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Answer for fill_blank or true_false */}
                    {(formData.type === 'fill_blank' || formData.type === 'true_false') && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Correct Answer</label>
                            {formData.type === 'true_false' ? (
                                <select
                                    value={formData.correct_answer}
                                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="">Select answer</option>
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.correct_answer}
                                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                    placeholder="Enter the correct answer"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            )}
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Subject</label>
                            <select
                                value={formData.subject_id}
                                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">Select subject</option>
                                {subjects?.map(s => (
                                    <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Difficulty</label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">Select difficulty</option>
                                <option value="easy">🟢 Easy</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="hard">🔴 Hard</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="e.g., chapter1, algebra, review"
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Source (optional)</label>
                        <input
                            type="text"
                            value={formData.source}
                            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                            placeholder="e.g., Textbook Chapter 5"
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Explanation (optional)</label>
                        <textarea
                            value={formData.explanation}
                            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                            placeholder="Why is this the correct answer?"
                            rows={2}
                            className="w-full px-3 py-2 border rounded-lg resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-2 p-4 border-t">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-1 py-2 bg-primary text-white rounded-lg font-semibold disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : question ? 'Update' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
