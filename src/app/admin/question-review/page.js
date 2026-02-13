'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminReviewQueue, useQuizReviewQueue, useAIReview, createAdminReview, updateQuestionStatus, updateRecord } from '@/hooks/useSupabaseData';
import { getStatusLabel, getStatusBadgeColor, getQueuePriority } from '@/lib/routingRules';
import AIReviewPanel from '@/components/AIReviewPanel';
import QuizAIAnalysisPanel from '@/components/QuizAIAnalysisPanel';


export default function AdminQuestionReviewPage() {
    const { user } = useAuth();
    const { data: questionQueue, loading: qLoading, refetch: refetchQuestions } = useAdminReviewQueue();
    const { data: quizQueue, loading: quizLoading, refetch: refetchQuizzes } = useQuizReviewQueue();
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [step, setStep] = useState('list'); // list, detail, quiz_detail
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Review form state
    const [reviewNotes, setReviewNotes] = useState('');
    const [overrides, setOverrides] = useState({
        bloom: null,
        difficulty: null,
        boundedness: null,
        hotsFlag: null
    });
    const [returnReasons, setReturnReasons] = useState([]);

    // Get AI review for selected question
    const { data: currentAIReview, loading: aiLoading } = useAIReview(selectedQuestion?.id);

    const loading = qLoading || quizLoading;

    // Sort queue by priority
    const sortedQueue = [...(questionQueue || [])].sort((a, b) => {
        const priorityA = getQueuePriority(a, null, []);
        const priorityB = getQueuePriority(b, null, []);
        return priorityA - priorityB;
    });

    // Combine quiz queue
    const pendingQuizzes = quizQueue || [];

    const handleSelectQuestion = (question) => {
        setSelectedQuestion(question);
        setSelectedQuiz(null);
        setReviewNotes('');
        setOverrides({ bloom: null, difficulty: null, boundedness: null, hotsFlag: null });
        setReturnReasons([]);
        setStep('detail');
    };

    const handleSelectQuiz = (quiz) => {
        setSelectedQuiz(quiz);
        setSelectedQuestion(null);
        setReviewNotes('');
        setStep('quiz_detail');
    };


    const handleApprove = async () => {
        if (!selectedQuestion) return;
        setIsSubmitting(true);

        try {
            // Create admin review record
            await createAdminReview(
                selectedQuestion.id,
                user?.id,
                'approve',
                overrides,
                reviewNotes
            );

            // Update question status
            await updateQuestionStatus(selectedQuestion.id, 'approved');

            refetch();
            setStep('list');
            setSelectedQuestion(null);
            alert('✅ Question approved!');
        } catch (error) {
            console.error('Error approving question:', error);
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReturn = async () => {
        if (!selectedQuestion || returnReasons.length === 0) {
            alert('Please select at least one reason for returning');
            return;
        }

        setIsSubmitting(true);

        try {
            // Create admin review record
            await createAdminReview(
                selectedQuestion.id,
                user?.id,
                'return',
                { ...overrides, returnReasons },
                reviewNotes
            );

            // Update question status with return reason
            await updateQuestionStatus(selectedQuestion.id, 'returned_to_teacher', {
                return_reason: returnReasons.join('; '),
                return_feedback: { reasons: returnReasons, notes: reviewNotes }
            });

            refetch();
            setStep('list');
            setSelectedQuestion(null);
            alert('Question returned to teacher for revision');
        } catch (error) {
            console.error('Error returning question:', error);
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleArchive = async () => {
        if (!selectedQuestion) return;
        if (!confirm('Are you sure you want to archive this question?')) return;

        setIsSubmitting(true);

        try {
            await createAdminReview(
                selectedQuestion.id,
                user?.id,
                'archive',
                {},
                reviewNotes
            );

            await updateQuestionStatus(selectedQuestion.id, 'archived');

            refetch();
            setStep('list');
            setSelectedQuestion(null);
        } catch (error) {
            console.error('Error archiving question:', error);
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleReturnReason = (reason) => {
        if (returnReasons.includes(reason)) {
            setReturnReasons(returnReasons.filter(r => r !== reason));
        } else {
            setReturnReasons([...returnReasons, reason]);
        }
    };

    // Queue List View
    if (step === 'list') {
        const totalPending = sortedQueue.length + pendingQuizzes.length;

        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text-main">🔍 QC Review Queue</h2>
                    <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                        {totalPending} pending
                    </span>
                </div>

                {loading ? (
                    <div className="py-12 text-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : totalPending === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        <span className="text-5xl">✅</span>
                        <p className="mt-3 font-medium">Queue is empty!</p>
                        <p className="text-sm">All items have been reviewed</p>
                    </div>
                ) : (
                    <>
                        {/* Quiz Queue */}
                        {pendingQuizzes.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-bold text-text-main flex items-center gap-2">
                                    📝 Quiz Pending Review
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs">
                                        {pendingQuizzes.length}
                                    </span>
                                </h3>
                                {pendingQuizzes.map((quiz) => (
                                    <div
                                        key={quiz.id}
                                        onClick={() => handleSelectQuiz(quiz)}
                                        className="bg-card-light rounded-xl p-4 border-2 border-purple-200 cursor-pointer hover:border-purple-400 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                                                        Quiz
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${quiz.difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                                                        quiz.difficulty === 'hard' ? 'bg-red-100 text-red-600' :
                                                            'bg-yellow-100 text-yellow-600'
                                                        }`}>
                                                        {quiz.difficulty || 'medium'}
                                                    </span>
                                                    {quiz.teacher_hots_claim && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                                                            🧠 HOTS Claim
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-text-main font-medium">{quiz.title}</p>
                                                <p className="text-xs text-text-muted mt-1">
                                                    {quiz.questions?.length || 0} questions •
                                                    Created {new Date(quiz.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Question Queue */}
                        {sortedQueue.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-bold text-text-main flex items-center gap-2">
                                    ❓ Individual Questions
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs">
                                        {sortedQueue.length}
                                    </span>
                                </h3>
                                {sortedQueue.map((question) => (
                                    <div
                                        key={question.id}
                                        onClick={() => handleSelectQuestion(question)}
                                        className="bg-card-light rounded-xl p-4 border border-gray-100 cursor-pointer hover:border-primary transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                                                        Needs Review
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        {question.type?.toUpperCase()}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                                                        {question.teacher_difficulty}
                                                    </span>
                                                    {question.teacher_hots_claim && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                                                            HOTS Claim
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-text-main line-clamp-2">{question.prompt}</p>
                                                <p className="text-xs text-text-muted mt-1">
                                                    {question.grade_band} • Grade {question.grade} •
                                                    Submitted {new Date(question.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

        );
    }

    // Detail Review View (for questions)
    if (step === 'detail') {
        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => { setStep('list'); setSelectedQuestion(null); }}
                        className="flex items-center gap-2 text-text-muted"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back to Queue
                    </button>
                    <h2 className="text-lg font-bold text-text-main">Review Question</h2>
                    <div></div>
                </div>

                {selectedQuestion && (
                    <>
                        {/* Question Content */}
                        <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    {selectedQuestion.type?.toUpperCase()}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                                    Teacher: {selectedQuestion.teacher_difficulty}
                                </span>
                                {selectedQuestion.teacher_hots_claim && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                                        Teacher Claims HOTS
                                    </span>
                                )}
                            </div>

                            <h3 className="font-bold text-text-main mb-2">Question</h3>
                            <p className="text-text-main whitespace-pre-wrap">{selectedQuestion.prompt}</p>

                            {selectedQuestion.type === 'mcq' && selectedQuestion.options && (
                                <div className="mt-4 space-y-2">
                                    <h4 className="font-medium text-text-muted">Options:</h4>
                                    {selectedQuestion.options.map((opt, i) => (
                                        <div key={opt.id} className={`p-2 rounded-lg ${opt.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                            {String.fromCharCode(65 + i)}. {opt.text} {opt.isCorrect && '✓'}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedQuestion.expected_answer && (
                                <div className="mt-4">
                                    <h4 className="font-medium text-text-muted mb-1">Expected Answer:</h4>
                                    <p className="text-sm text-text-main bg-gray-50 p-2 rounded-lg">
                                        {selectedQuestion.expected_answer}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* AI Review Panel */}
                        <AIReviewPanel questionId={selectedQuestion.id} />

                        {/* Override Controls */}
                        <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                            <h3 className="font-bold text-text-main mb-3">🔧 Tag Overrides (Optional)</h3>
                            <p className="text-sm text-text-muted mb-4">Override AI classifications if needed:</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-text-muted">Bloom Level</label>
                                    <select
                                        value={overrides.bloom || ''}
                                        onChange={(e) => setOverrides({ ...overrides, bloom: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                                    >
                                        <option value="">Keep AI value</option>
                                        {[1, 2, 3, 4, 5, 6].map(l => (
                                            <option key={l} value={l}>
                                                {l} - {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'][l - 1]}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm text-text-muted">Difficulty</label>
                                    <select
                                        value={overrides.difficulty || ''}
                                        onChange={(e) => setOverrides({ ...overrides, difficulty: e.target.value || null })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                                    >
                                        <option value="">Keep AI value</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm text-text-muted">Boundedness</label>
                                    <select
                                        value={overrides.boundedness || ''}
                                        onChange={(e) => setOverrides({ ...overrides, boundedness: e.target.value || null })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                                    >
                                        <option value="">Keep AI value</option>
                                        <option value="B0">B0 - Poor</option>
                                        <option value="B1">B1 - Partial</option>
                                        <option value="B2">B2 - Good</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm text-text-muted">HOTS</label>
                                    <select
                                        value={overrides.hotsFlag === null ? '' : overrides.hotsFlag ? 'true' : 'false'}
                                        onChange={(e) => setOverrides({ ...overrides, hotsFlag: e.target.value === '' ? null : e.target.value === 'true' })}
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200"
                                    >
                                        <option value="">Keep AI value</option>
                                        <option value="true">Yes - Is HOTS</option>
                                        <option value="false">No - Not HOTS</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Return Reasons (for Return action) */}
                        <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                            <h3 className="font-bold text-text-main mb-3">📝 Return Reasons (select if returning)</h3>
                            <div className="space-y-2">
                                {[
                                    'Boundedness issues (B0) - missing info or ambiguous grading',
                                    'Difficulty mismatch - label does not match content',
                                    'HOTS claim not supported - question is recall/understanding level',
                                    'Ambiguity detected - question has unclear wording',
                                    'Grade fit issues - content not appropriate for grade level',
                                    'Quality issues - needs clearer structure or instructions',
                                    'Other - see notes below'
                                ].map((reason) => (
                                    <label key={reason} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={returnReasons.includes(reason)}
                                            onChange={() => toggleReturnReason(reason)}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span className="text-sm">{reason}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                            <h3 className="font-bold text-text-main mb-3">💬 Review Notes</h3>
                            <textarea
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                placeholder="Add any notes for the teacher or for your records..."
                                className="w-full p-3 rounded-xl border border-gray-200 min-h-[100px]"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={handleArchive}
                                disabled={isSubmitting}
                                className="py-3 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 disabled:opacity-50"
                            >
                                🗑️ Archive
                            </button>
                            <button
                                onClick={handleReturn}
                                disabled={isSubmitting || returnReasons.length === 0}
                                className="py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50"
                            >
                                ↩️ Return to Teacher
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isSubmitting}
                                className="py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50"
                            >
                                {isSubmitting ? '...' : '✅ Approve'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Quiz Detail View
    if (step === 'quiz_detail' && selectedQuiz) {
        const handleApproveQuiz = async () => {
            setIsSubmitting(true);
            try {
                await updateRecord('assessments', selectedQuiz.id, {
                    qc_status: 'approved',
                    qc_reviewed_by: user?.id,
                    qc_reviewed_at: new Date().toISOString(),
                    qc_notes: reviewNotes
                });
                refetchQuizzes();
                setStep('list');
                setSelectedQuiz(null);
                alert('✅ Quiz approved!');
            } catch (error) {
                console.error('Error approving quiz:', error);
                alert('Error: ' + error.message);
            } finally {
                setIsSubmitting(false);
            }
        };

        const handleRejectQuiz = async () => {
            setIsSubmitting(true);
            try {
                await updateRecord('assessments', selectedQuiz.id, {
                    qc_status: 'rejected',
                    qc_reviewed_by: user?.id,
                    qc_reviewed_at: new Date().toISOString(),
                    qc_notes: reviewNotes
                });
                refetchQuizzes();
                setStep('list');
                setSelectedQuiz(null);
                alert('Quiz rejected and returned to teacher');
            } catch (error) {
                console.error('Error rejecting quiz:', error);
                alert('Error: ' + error.message);
            } finally {
                setIsSubmitting(false);
            }
        };

        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => { setStep('list'); setSelectedQuiz(null); }}
                        className="flex items-center gap-2 text-text-muted"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back to Queue
                    </button>
                    <h2 className="text-lg font-bold text-text-main">Review Quiz</h2>
                    <div></div>
                </div>

                {/* Quiz Info */}
                <div className="bg-card-light rounded-xl p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                            Quiz
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedQuiz.difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                            selectedQuiz.difficulty === 'hard' ? 'bg-red-100 text-red-600' :
                                'bg-yellow-100 text-yellow-600'
                            }`}>
                            Teacher: {selectedQuiz.difficulty || 'medium'}
                        </span>
                        {selectedQuiz.teacher_hots_claim && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                                🧠 Teacher Claims HOTS
                            </span>
                        )}
                    </div>

                    <h3 className="font-bold text-text-main text-lg mb-2">{selectedQuiz.title}</h3>
                    <p className="text-sm text-text-muted">
                        {selectedQuiz.questions?.length || 0} questions • Type: {selectedQuiz.type}
                    </p>
                </div>

                {/* Questions Preview */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h3 className="font-bold text-text-main mb-3">📝 Questions</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedQuiz.questions?.map((q, idx) => (
                            <div key={q.id || idx} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-medium text-gray-500">Q{idx + 1}</span>
                                    {q.difficulty && (
                                        <span className={`px-1.5 py-0.5 rounded text-xs ${q.difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                                            q.difficulty === 'hard' ? 'bg-red-100 text-red-600' :
                                                'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            {q.difficulty}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-text-main">{q.prompt}</p>
                                {q.options && (
                                    <div className="mt-2 space-y-1">
                                        {q.options.map((opt, optIdx) => (
                                            <div key={opt.id || optIdx} className={`text-xs px-2 py-1 rounded ${opt.isCorrect ? 'bg-green-100 text-green-700' : 'text-gray-600'
                                                }`}>
                                                {String.fromCharCode(65 + optIdx)}. {opt.text} {opt.isCorrect && '✓'}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Analysis Panel */}
                <QuizAIAnalysisPanel quiz={selectedQuiz} />

                {/* Notes */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h3 className="font-bold text-text-main mb-3">💬 Review Notes</h3>
                    <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add notes for the teacher if rejecting, or for records..."
                        className="w-full p-3 rounded-xl border border-gray-200 min-h-[100px]"
                    />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleRejectQuiz}
                        disabled={isSubmitting}
                        className="py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50"
                    >
                        ❌ Reject Quiz
                    </button>
                    <button
                        onClick={handleApproveQuiz}
                        disabled={isSubmitting}
                        className="py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50"
                    >
                        {isSubmitting ? '...' : '✅ Approve Quiz'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}


