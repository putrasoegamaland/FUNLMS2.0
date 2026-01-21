'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments, useClasses, useSubmissions, useUsers, createRecord, updateRecord, deleteRecord } from '@/hooks/useSupabaseData';
import { supabase } from '@/lib/supabase';

export default function TeacherAssignmentsPage() {
    const { user } = useAuth();
    const { data: allAssignments, loading: assignmentsLoading, refetch: refetchAssignments } = useAssignments();
    const { data: allClasses, loading: classesLoading } = useClasses({ teacher_id: user?.id });
    const { data: allSubmissions, loading: submissionsLoading, refetch: refetchSubmissions } = useSubmissions();

    const [showForm, setShowForm] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        due_date: '',
        class_id: '',
        max_score: 100,
    });

    const isLoading = assignmentsLoading || classesLoading || submissionsLoading;

    // Filter assignments created by this teacher (via class ownership)
    const classIds = allClasses.map(c => c.id);
    const assignments = allAssignments.filter(a => classIds.includes(a.class_id));

    const handleSubmit = async () => {
        if (!formData.title) {
            alert('Please enter a title');
            return;
        }

        try {
            await createRecord('assignments', formData);
            setFormData({ title: '', description: '', due_date: '', class_id: '', max_score: 100 });
            setShowForm(false);
            refetchAssignments();
        } catch (error) {
            alert('Error creating assignment: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this assignment?')) {
            await deleteRecord('assignments', id);
            refetchAssignments();
        }
    };

    // View submissions for an assignment
    if (selectedAssignment) {
        const submissions = allSubmissions.filter(s => s.assignment_id === selectedAssignment.id);

        return (
            <AssignmentSubmissions
                assignment={selectedAssignment}
                submissions={submissions}
                onBack={() => {
                    setSelectedAssignment(null);
                    refetchSubmissions();
                }}
                userId={user?.id}
                refetch={refetchSubmissions}
            />
        );
    }

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading assignments...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-text-main">📋 Assignments</h2>
                    <p className="text-sm text-text-muted">Create and manage assignments</p>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-text-main">➕ New Assignment</h3>
                        <button onClick={() => setShowForm(false)} className="text-text-muted">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Draw Your Favorite Animal"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Instructions</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what students need to do..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Due Date</label>
                            <input
                                type="datetime-local"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Max Score</label>
                            <input
                                type="number"
                                value={formData.max_score}
                                onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">Assign to Class</label>
                        <select
                            value={formData.class_id}
                            onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                        >
                            <option value="">Select a class...</option>
                            {allClasses.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    {cls.emoji} {cls.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                    >
                        Create Assignment
                    </button>
                </div>
            )}

            {/* Assignments List */}
            {assignments.length > 0 ? (
                <div className="space-y-3">
                    {assignments.map((assignment) => {
                        const submissions = allSubmissions.filter(s => s.assignment_id === assignment.id);
                        const gradedCount = submissions.filter(s => s.grade !== undefined && s.grade !== null).length;
                        const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();

                        return (
                            <div
                                key={assignment.id}
                                className="bg-card-light rounded-xl p-4 border border-gray-100"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
                                        📋
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-text-main">{assignment.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-text-muted">
                                                {submissions.length} submissions
                                            </span>
                                            {gradedCount < submissions.length && submissions.length > 0 && (
                                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                                    {submissions.length - gradedCount} to grade
                                                </span>
                                            )}
                                            {isOverdue && (
                                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                    Past due
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setSelectedAssignment(assignment)}
                                            className="p-2 hover:bg-blue-50 rounded-lg"
                                        >
                                            <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 20 }}>visibility</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(assignment.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg"
                                        >
                                            <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-card-light rounded-xl border border-gray-100">
                    <span className="text-5xl mb-4 block">📋</span>
                    <p className="text-text-muted">No assignments yet</p>
                    <p className="text-sm text-text-muted">Create your first assignment!</p>
                </div>
            )}

            {/* FAB */}
            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="fixed bottom-24 right-4 flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-full shadow-lg font-bold"
                >
                    <span className="material-symbols-outlined">add</span>
                    New Assignment
                </button>
            )}
        </div>
    );
}

// Assignment Submissions View with Grading
function AssignmentSubmissions({ assignment, submissions, onBack, userId, refetch }) {
    const { data: users } = useUsers({ role: 'student' });
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [score, setScore] = useState('');
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    const handleGrade = async () => {
        if (score === '') return;
        setSaving(true);

        try {
            await updateRecord('submissions', selectedSubmission.id, {
                grade: parseInt(score),
                feedback,
                graded_at: new Date().toISOString(),
            });

            setSelectedSubmission(null);
            setScore('');
            setFeedback('');
            refetch();
        } catch (error) {
            alert('Error saving grade: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (selectedSubmission) {
        const student = users.find(u => u.id === selectedSubmission.student_id);

        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedSubmission(null)}>
                        <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-text-main">Grade Submission</h2>
                        <p className="text-sm text-text-muted">{student?.name || 'Unknown'}</p>
                    </div>
                </div>

                {/* Uploaded Files */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h4 className="font-bold text-text-main mb-3">📎 Uploaded Files</h4>
                    {selectedSubmission.file_name ? (
                        selectedSubmission.file_type?.startsWith('image') ? (
                            <img
                                src={selectedSubmission.file_data}
                                alt={selectedSubmission.file_name}
                                className="max-w-full rounded-lg border"
                            />
                        ) : (
                            <a
                                href={selectedSubmission.file_data}
                                download={selectedSubmission.file_name}
                                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                            >
                                <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                                <span className="text-text-main">{selectedSubmission.file_name}</span>
                                <span className="material-symbols-outlined ml-auto text-text-muted">download</span>
                            </a>
                        )
                    ) : (
                        <p className="text-text-muted">No file uploaded</p>
                    )}
                </div>

                {/* Grading */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-4">
                    <h4 className="font-bold text-text-main">✏️ Grade</h4>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">
                            Score (0-{assignment.max_score || 100})
                        </label>
                        <input
                            type="number"
                            min="0"
                            max={assignment.max_score || 100}
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-2xl font-bold text-center"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Feedback</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Write feedback..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 resize-none"
                        />
                    </div>
                    <button
                        onClick={handleGrade}
                        disabled={score === '' || saving}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Grade'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack}>
                    <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                </button>
                <div>
                    <h2 className="text-lg font-bold text-text-main">{assignment.title}</h2>
                    <p className="text-sm text-text-muted">{submissions.length} submissions</p>
                </div>
            </div>

            {assignment.description && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-700">{assignment.description}</p>
                </div>
            )}

            {submissions.length > 0 ? (
                <div className="space-y-3">
                    {submissions.map((sub) => {
                        const student = users.find(u => u.id === sub.student_id);
                        return (
                            <button
                                key={sub.id}
                                onClick={() => setSelectedSubmission(sub)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card-light border border-gray-100 text-left hover:border-primary"
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${sub.grade !== undefined && sub.grade !== null ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    {sub.grade !== undefined && sub.grade !== null ? sub.grade : '?'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-text-main">{student?.name || 'Unknown'}</p>
                                    <p className="text-sm text-text-muted">
                                        Submitted: {new Date(sub.submitted_at).toLocaleString()}
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-text-muted">chevron_right</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <span className="text-4xl mb-3 block">📭</span>
                    <p className="text-text-muted">No submissions yet</p>
                </div>
            )}
        </div>
    );
}
