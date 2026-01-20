'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import storage from '@/lib/storage';

export default function TeacherGradingPage() {
    const { user } = useAuth();
    const [pendingSubmissions, setPendingSubmissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [score, setScore] = useState('');
    const [feedback, setFeedback] = useState('');
    const [filter, setFilter] = useState('pending'); // pending, graded, all

    useEffect(() => {
        loadSubmissions();
    }, [user, filter]);

    const loadSubmissions = () => {
        // Get all essay/written exam attempts that need grading
        const allAttempts = storage.attempts?.getAll?.() || [];
        const teacherAssessments = storage.assessments.getAll()
            .filter(a => a.createdBy === user?.id && (a.type === 'essay' || a.type === 'written_exam'));

        const assessmentIds = teacherAssessments.map(a => a.id);

        let filtered = allAttempts.filter(attempt =>
            assessmentIds.includes(attempt.assessmentId)
        );

        if (filter === 'pending') {
            filtered = filtered.filter(a => !a.teacherScore && a.teacherScore !== 0);
        } else if (filter === 'graded') {
            filtered = filtered.filter(a => a.teacherScore !== undefined);
        }

        // Enrich with student and assessment info
        const enriched = filtered.map(attempt => {
            const student = storage.users.getById(attempt.studentId);
            const assessment = storage.assessments.getById(attempt.assessmentId);
            return {
                ...attempt,
                studentName: student?.name || 'Unknown',
                assessmentTitle: assessment?.title || 'Unknown Quiz',
                assessmentType: assessment?.type,
            };
        });

        setPendingSubmissions(enriched);
    };

    const handleGrade = () => {
        if (!selectedSubmission || score === '') return;

        const numScore = parseInt(score);
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            alert('Please enter a valid score (0-100)');
            return;
        }

        storage.attempts.update(selectedSubmission.id, {
            teacherScore: numScore,
            teacherFeedback: feedback,
            gradedAt: new Date().toISOString(),
            gradedBy: user?.id,
            score: numScore, // Also update main score
        });

        setSelectedSubmission(null);
        setScore('');
        setFeedback('');
        loadSubmissions();
    };

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
                    {Object.entries(selectedSubmission.answers || {}).map(([qId, answer], i) => (
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

                    {/* Drawing answers if any */}
                    {selectedSubmission.drawings && Object.entries(selectedSubmission.drawings).map(([qId, drawing], i) => (
                        <div key={`drawing-${qId}`} className="border-b border-gray-100 pb-3 last:border-0">
                            <p className="text-sm font-medium text-text-muted mb-1">Drawing {i + 1}</p>
                            <img src={drawing} alt="Drawing" className="max-h-60 rounded-lg border" />
                        </div>
                    ))}
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
                        disabled={score === ''}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                    >
                        Submit Grade
                    </button>
                </div>
            </div>
        );
    }

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
                    <p className="text-2xl font-bold text-orange-600">
                        {pendingSubmissions.filter(s => !s.teacherScore && s.teacherScore !== 0).length}
                    </p>
                    <p className="text-sm text-orange-700">Pending</p>
                </div>
                <div className="bg-green-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                        {pendingSubmissions.filter(s => s.teacherScore !== undefined).length}
                    </p>
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
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${submission.teacherScore !== undefined
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-orange-100 text-orange-600'
                                }`}>
                                {submission.teacherScore !== undefined
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
