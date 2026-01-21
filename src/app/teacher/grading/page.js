'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttempts, useSubmissions, useAssessments, useAssignments, useUsers, useClasses, updateRecord } from '@/hooks/useSupabaseData';

export default function TeacherGradingPage() {
    const { user } = useAuth();
    const { data: attempts, loading: attemptsLoading, refetch: refetchAttempts } = useAttempts();
    const { data: submissions, loading: submissionsLoading, refetch: refetchSubmissions } = useSubmissions();
    const { data: assessments, loading: assessmentsLoading } = useAssessments();
    const { data: assignments, loading: assignmentsLoading } = useAssignments();
    const { data: users, loading: usersLoading } = useUsers();
    const { data: classes, loading: classesLoading } = useClasses({ teacher_id: user?.id });

    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [score, setScore] = useState('');
    const [feedback, setFeedback] = useState('');
    const [filter, setFilter] = useState('pending');
    const [saving, setSaving] = useState(false);

    const isLoading = attemptsLoading || submissionsLoading || assessmentsLoading || assignmentsLoading || usersLoading || classesLoading;

    // Get class IDs owned by this teacher
    const classIds = useMemo(() => classes.map(c => c.id), [classes]);

    // Combine and filter submissions for grading
    const pendingSubmissions = useMemo(() => {
        // Assignment submissions for teacher's classes
        const teacherAssignments = assignments.filter(a => classIds.includes(a.class_id));
        const assignmentIds = teacherAssignments.map(a => a.id);

        let assignmentSubmissions = submissions
            .filter(sub => assignmentIds.includes(sub.assignment_id))
            .map(sub => {
                const assignment = assignments.find(a => a.id === sub.assignment_id);
                const student = users.find(u => u.id === sub.student_id);
                return {
                    ...sub,
                    isAssignment: true,
                    completedAt: sub.submitted_at || sub.created_at,
                    studentName: student?.name || 'Unknown',
                    assessmentTitle: assignment?.title || 'Unknown Assignment',
                    assessmentType: 'assignment',
                    teacherScore: sub.grade,
                };
            });

        // Essay/written exam attempts for teacher's assessments
        const teacherAssessments = assessments.filter(a =>
            classIds.includes(a.class_id) && (a.type === 'essay' || a.type === 'written_exam')
        );
        const assessmentIds = teacherAssessments.map(a => a.id);

        let attemptItems = attempts
            .filter(attempt => assessmentIds.includes(attempt.assessment_id))
            .map(attempt => {
                const assessment = assessments.find(a => a.id === attempt.assessment_id);
                const student = users.find(u => u.id === attempt.user_id);
                return {
                    ...attempt,
                    isAssignment: false,
                    completedAt: attempt.completed_at || attempt.created_at,
                    studentName: student?.name || 'Unknown',
                    assessmentTitle: assessment?.title || 'Unknown Quiz',
                    assessmentType: assessment?.type,
                    teacherScore: attempt.teacher_score,
                };
            });

        let allItems = [...attemptItems, ...assignmentSubmissions];

        if (filter === 'pending') {
            allItems = allItems.filter(a => a.teacherScore === undefined || a.teacherScore === null);
        } else if (filter === 'graded') {
            allItems = allItems.filter(a => a.teacherScore !== undefined && a.teacherScore !== null);
        }

        return allItems.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    }, [submissions, attempts, assignments, assessments, users, classIds, filter]);

    const handleGrade = async () => {
        if (!selectedSubmission || score === '') return;

        const numScore = parseInt(score);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            alert('Please enter a valid score (0-100)');
            return;
        }

        setSaving(true);
        try {
            if (selectedSubmission.isAssignment) {
                await updateRecord('submissions', selectedSubmission.id, {
                    grade: numScore,
                    feedback,
                    graded_at: new Date().toISOString(),
                });
                refetchSubmissions();
            } else {
                await updateRecord('attempts', selectedSubmission.id, {
                    teacher_score: numScore,
                    teacher_feedback: feedback,
                    graded_at: new Date().toISOString(),
                });
                refetchAttempts();
            }

            setSelectedSubmission(null);
            setScore('');
            setFeedback('');
        } catch (error) {
            alert('Error saving grade: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading submissions...</p>
                </div>
            </div>
        );
    }

    if (selectedSubmission) {
        return (
            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedSubmission(null)}>
                        <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-text-main">Grade Submission</h2>
                        <p className="text-sm text-text-muted">{selectedSubmission.studentName}</p>
                    </div>
                </div>

                {/* Submission Info */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h3 className="font-bold text-text-main mb-2">{selectedSubmission.assessmentTitle}</h3>
                    <p className="text-sm text-text-muted">
                        Submitted: {new Date(selectedSubmission.completedAt).toLocaleString()}
                    </p>
                </div>

                {/* Student Answers */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-4">
                    <h4 className="font-bold text-text-main">📝 Student's Answers</h4>
                    {selectedSubmission.answers && Object.entries(selectedSubmission.answers).map(([qId, answer], i) => (
                        <div key={qId} className="border-b border-gray-100 pb-3 last:border-0">
                            <p className="text-sm font-medium text-text-muted mb-1">Question {i + 1}</p>
                            <div className="bg-gray-50 rounded-lg p-3">
                                {typeof answer === 'string' ? (
                                    answer.startsWith('data:image') ? (
                                        <img src={answer} alt="Answer" className="max-h-40 rounded" />
                                    ) : (
                                        <p className="text-text-main whitespace-pre-wrap">{answer}</p>
                                    )
                                ) : (
                                    <p className="text-text-muted italic">No answer provided</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {(!selectedSubmission.answers || Object.keys(selectedSubmission.answers).length === 0) && (
                        <p className="text-text-muted">No text answers</p>
                    )}
                </div>

                {/* Grading Form */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-4">
                    <h4 className="font-bold text-text-main">✏️ Your Grade</h4>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Score (0-100)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            placeholder="Enter score..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none text-2xl font-bold text-center"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Feedback (Optional)</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Write feedback for the student..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none resize-none"
                        />
                    </div>

                    <button
                        onClick={handleGrade}
                        disabled={score === '' || saving}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Submit Grade'}
                    </button>
                </div>
            </div>
        );
    }

    const pendingCount = pendingSubmissions.filter(s => s.teacherScore === undefined || s.teacherScore === null).length;
    const gradedCount = pendingSubmissions.filter(s => s.teacherScore !== undefined && s.teacherScore !== null).length;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-text-main">✏️ Grading Center</h2>
                <p className="text-sm text-text-muted">Review and grade student submissions</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                {['pending', 'graded', 'all'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 py-2 rounded-lg font-medium text-sm capitalize transition-colors ${filter === f ? 'bg-white text-text-main shadow-sm' : 'text-text-muted'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                    <p className="text-sm text-orange-700">Pending</p>
                </div>
                <div className="bg-green-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{gradedCount}</p>
                    <p className="text-sm text-green-700">Graded</p>
                </div>
            </div>

            {/* Submissions List */}
            {pendingSubmissions.length > 0 ? (
                <div className="space-y-3">
                    {pendingSubmissions.map((submission) => (
                        <button
                            key={submission.id}
                            onClick={() => setSelectedSubmission(submission)}
                            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card-light border border-gray-100 text-left hover:border-primary transition-colors"
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${submission.teacherScore !== undefined && submission.teacherScore !== null
                                ? 'bg-green-100 text-green-600'
                                : 'bg-orange-100 text-orange-600'
                                }`}>
                                {submission.teacherScore !== undefined && submission.teacherScore !== null
                                    ? submission.teacherScore
                                    : '?'}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-text-main">{submission.studentName}</p>
                                <p className="text-sm text-text-muted">{submission.assessmentTitle}</p>
                                <p className="text-xs text-text-muted">
                                    {new Date(submission.completedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-text-muted">chevron_right</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-card-light rounded-xl border border-gray-100">
                    <span className="text-5xl mb-4 block">✅</span>
                    <p className="text-text-muted">No submissions to grade</p>
                    <p className="text-sm text-text-muted">You're all caught up!</p>
                </div>
            )}
        </div>
    );
}
