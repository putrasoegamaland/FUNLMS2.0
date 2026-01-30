'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useEnrollments, useAssessments, useSubjects, createRecord, logStudentActivity } from '@/hooks/useSupabaseData';
import { generateHint, generateExplanation, isGeminiConfigured } from '@/lib/geminiAI';
import { createExamMode, checkAccessibility, formatCountdown } from '@/lib/examMode';
import DrawingCanvas from '@/components/DrawingCanvas';
import { FeedbackAnimation } from '@/components/FeedbackAnimation';

function PracticeQuizContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { awardXP, config } = useGame();
    const drawingRef = useRef(null);

    const { data: enrollments, loading: enrollmentsLoading } = useEnrollments({ student_id: user?.id });
    const { data: allAssessments, loading: assessmentsLoading } = useAssessments();
    const { data: subjects, loading: subjectsLoading } = useSubjects();

    const [step, setStep] = useState('select'); // select, quiz, results
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [textAnswers, setTextAnswers] = useState({});
    const [drawingAnswers, setDrawingAnswers] = useState({});
    const [showHint, setShowHint] = useState(false);
    const [hintText, setHintText] = useState('');
    const [hintLoading, setHintLoading] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [results, setResults] = useState(null);
    const [examMode, setExamMode] = useState(null);
    const [violations, setViolations] = useState([]);
    const [showViolationWarning, setShowViolationWarning] = useState(false);
    const [accessInfo, setAccessInfo] = useState(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackCorrect, setFeedbackCorrect] = useState(false);
    const [feedbackXP, setFeedbackXP] = useState(0);

    const isLoading = enrollmentsLoading || assessmentsLoading || subjectsLoading;

    // Filter assessments for student's classes
    const assessments = useMemo(() => {
        const classIds = enrollments.map(e => e.class_id);
        return allAssessments.filter(a => {
            if (a.type === 'game') return false;
            const assigned = a.class_id && classIds.includes(a.class_id);
            return assigned || !a.class_id; // Show unassigned quizzes too
        }).map(a => ({
            ...a,
            access: checkAccessibility(a),
        }));
    }, [enrollments, allAssessments]);

    // Auto-start quiz from URL param
    useEffect(() => {
        const quizId = searchParams.get('id');
        const subjectId = searchParams.get('subject');

        if (quizId && assessments.length > 0) {
            const quiz = assessments.find(a => a.id === quizId);
            if (quiz) {
                if (quiz.access?.accessible) {
                    startQuiz(quiz);
                } else {
                    alert(`This quiz is not accessible: ${quiz.access?.reason || 'Locked'}`);
                }
                return;
            }
        }

        if (subjectId && assessments.length > 0) {
            const subjectAssessments = assessments.filter(a => a.subject_id === subjectId && a.access?.accessible);
            if (subjectAssessments.length > 0) {
                startQuiz(subjectAssessments[0]);
            }
        }
    }, [searchParams, assessments]);

    // Cleanup exam mode on unmount
    useEffect(() => {
        return () => {
            if (examMode) {
                examMode.stop();
            }
        };
    }, [examMode]);

    const startQuiz = (quiz) => {
        setSelectedQuiz(quiz);
        setStep('quiz');
        setCurrentQuestion(0);
        setAnswers({});
        setTextAnswers({});
        setDrawingAnswers({});
        setHintsUsed(0);
        setViolations([]);

        // Start exam mode if written exam with tab lock
        if (quiz.type === 'written_exam' && quiz.settings?.tabLock) {
            const mode = createExamMode({
                maxViolations: 3,
                showWarning: true,
                onViolation: (violation, count) => {
                    setViolations(prev => [...prev, violation]);
                    if (count === 1) {
                        setShowViolationWarning(true);
                    }
                },
                onMaxViolations: () => {
                    // Auto-submit after 3 violations
                    handleSubmit(true);
                },
            });
            mode.start();
            setExamMode(mode);
        }
    };

    const handleAnswer = (questionId, answer) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));

        // Check if real-time feedback is enabled
        if (selectedQuiz?.settings?.realtimeFeedback && selectedQuiz?.type !== 'written_exam') {
            const question = selectedQuiz?.questions?.find(q => q.id === questionId);
            if (question) {
                const correctOption = question.options?.find(o => o.isCorrect);
                const isCorrect = answer === correctOption?.id;

                setFeedbackCorrect(isCorrect);
                setFeedbackXP(isCorrect ? (config?.xpPerCorrect || 10) : 0);
                setShowFeedback(true);
            }
        }
    };

    const handleFeedbackComplete = () => {
        setShowFeedback(false);

        // Auto-advance to next question or stay on current
        const totalQuestions = selectedQuiz?.questions?.length || 0;
        if (feedbackCorrect && currentQuestion < totalQuestions - 1) {
            setCurrentQuestion(c => c + 1);
            setShowHint(false);
            setHintText('');
        }
    };

    const handleTextAnswer = (questionId, text) => {
        setTextAnswers(prev => ({ ...prev, [questionId]: text }));
    };

    const handleDrawingAnswer = (questionId, imageData) => {
        setDrawingAnswers(prev => ({ ...prev, [questionId]: imageData }));
    };

    const requestHint = async () => {
        const question = selectedQuiz?.questions?.[currentQuestion];
        if (!question) return;

        setHintLoading(true);
        setShowHint(true);

        try {
            const hint = await generateHint(question, 'elementary');
            setHintText(hint);
            setHintsUsed(h => h + 1);
        } catch (error) {
            setHintText("💡 Take your time and think carefully!");
        }

        setHintLoading(false);
    };

    const handleSubmit = async (forced = false) => {
        // Stop exam mode
        if (examMode) {
            examMode.stop();
            setExamMode(null);
        }

        const quiz = selectedQuiz;
        let correctCount = 0;

        // Score multiple choice questions
        quiz.questions?.forEach(q => {
            if (q.type === 'mc' || !q.type) {
                const userAnswer = answers[q.id];
                const correctOption = q.options?.find(o => o.isCorrect);
                if (userAnswer === correctOption?.id) {
                    correctCount++;
                }
            }
        });

        // Score calculation
        const mcQuestions = quiz.questions?.filter(q => q.type === 'mc' || !q.type).length || 0;

        // For purely manual assessments (drawing/essay), score is null until graded
        const isManualGrading = ['essay', 'written_exam', 'drawing'].includes(quiz.type);
        const score = isManualGrading ? null : (mcQuestions > 0 ? Math.round((correctCount / mcQuestions) * 100) : 0);

        const isPerfect = score === 100;

        // Calculate XP - always award at least base XP for completing
        let xpEarned = correctCount * (config?.xpPerCorrect || 10);
        if (isManualGrading) {
            // Award participation XP for drawing/essay (scaled by question count)
            xpEarned = (quiz.questions?.length || 1) * (config?.xpPerCorrect || 10);
        }
        if (isPerfect) {
            xpEarned += config?.xpPerfectBonus || 20;
        }

        // Award XP
        try {
            await awardXP(xpEarned, quiz.subject_id);
        } catch (e) {
            console.error('Error awarding XP:', e);
        }

        // Save attempt to Supabase
        const attemptData = {
            user_id: user?.id,
            assessment_id: quiz.id,
            subject_id: quiz.subject_id,
            score,
            answers: {
                ...answers,
                ...textAnswers,
                ...drawingAnswers,
            },
            violations: violations.length,
            forced_submit: forced,
            completed_at: new Date().toISOString(),
        };

        try {
            await createRecord('attempts', attemptData);

            // Log student activity
            await logStudentActivity(
                user?.id,
                'quiz_completed',
                quiz.id,
                quiz.title,
                { score, correctCount, totalQuestions: mcQuestions, xpEarned }
            );

            console.log('Quiz attempt saved and logged successfully');
        } catch (error) {
            console.error('Error saving attempt:', error);
            alert('Error saving your submission. Please check your connection.');
        }

        setResults({
            score,
            correctCount,
            totalQuestions: mcQuestions,
            xpEarned,
            isPerfect,
            violations: violations.length,
        });
        setStep('results');
    };

    const question = selectedQuiz?.questions?.[currentQuestion];
    const totalQuestions = selectedQuiz?.questions?.length || 0;
    const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;
    const isEssayOrExam = ['essay', 'written_exam', 'drawing'].includes(selectedQuiz?.type);
    const allowDrawing = selectedQuiz?.settings?.allowImageAnswer || selectedQuiz?.type === 'drawing';

    // Quiz Selection Screen
    if (step === 'select') {
        if (isLoading) {
            return (
                <div className="p-4 flex items-center justify-center min-h-[50vh]">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-text-muted">Loading quizzes...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4 space-y-4">
                <h2 className="text-lg font-bold text-text-main">Choose a Quiz</h2>

                {assessments.length > 0 ? (
                    <div className="space-y-3">
                        {assessments.map((quiz) => {
                            const subject = subjects.find(s => s.id === quiz.subject_id);
                            const locked = !quiz.access?.accessible;

                            return (
                                <button
                                    key={quiz.id}
                                    onClick={() => !locked && startQuiz(quiz)}
                                    disabled={locked}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${locked
                                        ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                                        : 'bg-card-light border-gray-100 hover:border-primary'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${locked ? 'bg-gray-100' : 'bg-primary/10'
                                        }`}>
                                        {locked ? '🔒' : subject?.emoji || '📝'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-text-main">{quiz.title}</p>
                                        <p className="text-sm text-text-muted">
                                            {quiz.questions?.length || 0} questions
                                            {quiz.type === 'written_exam' && ' • Exam Mode'}
                                        </p>
                                        {locked && quiz.access.reason === 'not_started' && (
                                            <p className="text-xs text-orange-500 mt-1">
                                                Starts in {formatCountdown(quiz.access.countdown)}
                                            </p>
                                        )}
                                        {locked && quiz.access.reason === 'expired' && (
                                            <p className="text-xs text-red-500 mt-1">Deadline passed</p>
                                        )}
                                    </div>
                                    {!locked && <span className="material-symbols-outlined text-primary">play_arrow</span>}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 text-text-muted">
                        <div className="text-4xl mb-4">📝</div>
                        <p>No quizzes available yet</p>
                        <p className="text-sm">Check back later!</p>
                    </div>
                )}
            </div>
        );
    }

    // Results Screen
    if (step === 'results') {
        return (
            <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm text-center space-y-6">
                    {/* Celebration */}
                    <div className="text-6xl animate-bounce">
                        {results.isPerfect ? '🎉' : results.score >= 70 ? '⭐' : '💪'}
                    </div>

                    <h2 className="text-2xl font-bold text-text-main">
                        {results.isPerfect ? 'PERFECT!' : results.score >= 70 ? 'Great Job!' : 'Good Effort!'}
                    </h2>

                    {/* Score Circle */}
                    <div className="w-32 h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-primary">{results.score}%</p>
                            <p className="text-sm text-text-muted">{results.correctCount}/{results.totalQuestions}</p>
                        </div>
                    </div>

                    {/* Violations Warning */}
                    {results.violations > 0 && (
                        <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                            <p className="text-sm text-red-600">⚠️ {results.violations} focus violation(s) detected</p>
                        </div>
                    )}

                    {/* XP Earned */}
                    <div className="bg-yellow-100 rounded-2xl p-4 flex items-center justify-center gap-3">
                        <span className="text-3xl">⭐</span>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-yellow-700">+{results.xpEarned} XP</p>
                            <p className="text-sm text-yellow-600">Experience earned!</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setStep('select');
                                setSelectedQuiz(null);
                                setCurrentQuestion(0);
                                setAnswers({});
                                setTextAnswers({});
                                setDrawingAnswers({});
                                setHintsUsed(0);
                                setViolations([]);
                            }}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                        >
                            Try Another Quiz
                        </button>
                        <button
                            onClick={() => router.push('/student/learn')}
                            className="w-full py-3 bg-gray-100 text-text-main font-bold rounded-xl"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Quiz Screen
    return (
        <div className="min-h-screen bg-background-light flex flex-col">
            {/* Violation Warning Modal */}
            {showViolationWarning && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm text-center">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h3 className="text-xl font-bold text-red-600 mb-2">Focus Warning!</h3>
                        <p className="text-text-muted mb-4">
                            Please stay on this page during the exam.
                            Switching tabs or windows is not allowed.
                        </p>
                        <p className="text-sm text-red-500 mb-4">
                            Violations: {violations.length}/3
                        </p>
                        <button
                            onClick={() => setShowViolationWarning(false)}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            )}

            {/* Real-time Feedback Animation */}
            {showFeedback && (
                <FeedbackAnimation
                    isCorrect={feedbackCorrect}
                    xpEarned={feedbackXP}
                    onComplete={handleFeedbackComplete}
                />
            )}

            {/* Header with Progress */}
            <header className="sticky top-0 bg-card-light border-b border-gray-100 p-4 z-10">
                <div className="flex items-center gap-4 mb-3">
                    <button onClick={() => {
                        if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
                            if (examMode) examMode.stop();
                            setStep('select');
                            setSelectedQuiz(null);
                        }
                    }}>
                        <span className="material-symbols-outlined text-text-muted">close</span>
                    </button>
                    <div className="flex-1">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    <span className="text-sm font-medium text-text-muted">
                        {currentQuestion + 1}/{totalQuestions}
                    </span>
                    {violations.length > 0 && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                            ⚠️ {violations.length}
                        </span>
                    )}
                </div>

                {/* Question Navigator */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {selectedQuiz?.questions?.map((q, i) => {
                        const isAnswered = answers[q.id] || textAnswers[q.id] || drawingAnswers[q.id];
                        const isCurrent = i === currentQuestion;

                        return (
                            <button
                                key={q.id}
                                onClick={() => setCurrentQuestion(i)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold shrink-0 transition-colors ${isCurrent
                                    ? 'bg-primary text-white'
                                    : isAnswered
                                        ? 'bg-green-100 text-green-600 border border-green-300'
                                        : 'bg-gray-100 text-text-muted'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Question */}
            <main className="flex-1 p-4 flex flex-col">
                {question ? (
                    <>
                        <div className="flex-1">
                            <p className="text-lg font-bold text-text-main mb-4">
                                {question.prompt || 'What is the answer?'}
                            </p>

                            {/* Question Image */}
                            {question.promptImage && (
                                <div className="mb-4 rounded-2xl overflow-hidden bg-gray-100">
                                    <img src={question.promptImage} alt="Question" className="w-full max-h-48 object-contain" />
                                </div>
                            )}

                            {/* Multiple Choice Options */}
                            {(question.type === 'mc' || question.type === 'multiple_choice' || (!question.type && selectedQuiz?.type !== 'drawing' && selectedQuiz?.type !== 'essay')) && (
                                <div className="space-y-3">
                                    {question.options?.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => handleAnswer(question.id, option.id)}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${answers[question.id] === option.id
                                                ? 'border-primary bg-primary/10 text-text-main'
                                                : 'border-gray-200 hover:border-gray-300 bg-white text-text-main'
                                                }`}
                                        >
                                            {option.image ? (
                                                <img src={option.image} alt="Option" className="h-16 rounded" />
                                            ) : (
                                                <span className="font-medium text-gray-900">{option.text || `Option ${option.id}`}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Essay / Written Answer */}
                            {(question.type === 'essay' || question.type === 'written_exam' || (!question.type && isEssayOrExam)) && (
                                <div className="space-y-4">
                                    <textarea
                                        value={textAnswers[question.id] || ''}
                                        onChange={(e) => handleTextAnswer(question.id, e.target.value)}
                                        placeholder="Type your answer here..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none resize-none bg-white text-gray-900 placeholder-gray-400"
                                    />

                                    {/* Drawing Canvas (if enabled) */}
                                    {allowDrawing && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-text-muted">Or draw your answer:</p>
                                            <DrawingCanvas
                                                ref={drawingRef}
                                                width={300}
                                                height={200}
                                                onChange={(imageData) => handleDrawingAnswer(question.id, imageData)}
                                                initialImage={drawingAnswers[question.id]}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Hint */}
                            {showHint && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                    {hintLoading ? (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                            Thinking...
                                        </div>
                                    ) : (
                                        <p className="text-sm text-blue-700">{hintText}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-6 space-y-3">
                            {/* AI Hint Button */}
                            {selectedQuiz?.settings?.aiHints && hintsUsed < (selectedQuiz?.settings?.hintLimit || 3) && (
                                <button
                                    onClick={requestHint}
                                    disabled={hintLoading}
                                    className="w-full py-3 border-2 border-primary text-primary font-bold rounded-xl flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">lightbulb</span>
                                    Get AI Hint ({(selectedQuiz?.settings?.hintLimit || 3) - hintsUsed} left)
                                    {!isGeminiConfigured() && <span className="text-xs">(offline)</span>}
                                </button>
                            )}

                            <div className="flex gap-3">
                                {selectedQuiz?.settings?.allowSkip && currentQuestion < totalQuestions - 1 && (
                                    <button
                                        onClick={() => {
                                            setCurrentQuestion(c => c + 1);
                                            setShowHint(false);
                                            setHintText('');
                                        }}
                                        className="flex-1 py-3 bg-gray-100 text-text-muted font-bold rounded-xl"
                                    >
                                        Skip
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (currentQuestion < totalQuestions - 1) {
                                            setCurrentQuestion(c => c + 1);
                                            setShowHint(false);
                                            setHintText('');
                                        } else {
                                            handleSubmit();
                                        }
                                    }}
                                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl"
                                >
                                    {currentQuestion < totalQuestions - 1 ? 'Next' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-text-muted">No questions in this quiz</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function StudentPracticePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <PracticeQuizContent />
        </Suspense>
    );
}
