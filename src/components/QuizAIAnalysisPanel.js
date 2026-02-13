'use client';

import { useState, useEffect } from 'react';
import { analyzeQuestion, isQCConfigured } from '@/lib/hotsQC';

/**
 * AI Analysis Panel for Quiz Review
 * Analyzes all questions in a quiz and provides AI opinion on difficulty, HOTS, etc.
 */
export default function QuizAIAnalysisPanel({ quiz }) {
    const [analyses, setAnalyses] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [overallSummary, setOverallSummary] = useState(null);

    const questions = quiz?.questions || [];
    const isConfigured = isQCConfigured();

    const runAnalysis = async () => {
        if (!isConfigured) {
            setError('AI tidak dikonfigurasi. Pastikan NEXT_PUBLIC_GEMINI_API_KEY sudah diset.');
            return;
        }

        if (questions.length === 0) {
            setError('Quiz tidak memiliki pertanyaan');
            return;
        }

        setLoading(true);
        setError(null);
        const results = {};

        try {
            // Analyze each question
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const result = await analyzeQuestion(
                    {
                        prompt: q.prompt,
                        type: q.type || 'mcq',
                        options: q.options,
                        expected_answer: q.expected_answer
                    },
                    'general', // Default subject
                    'sd_45' // Default grade band
                );

                results[q.id || i] = result;
            }

            setAnalyses(results);

            // Calculate overall summary
            const successful = Object.values(results).filter(r => r.success);
            if (successful.length > 0) {
                const difficulties = successful.map(r => r.data?.difficulty?.label || 'medium');
                const hotsCount = successful.filter(r => r.data?.hots?.flag).length;
                const avgBloom = successful.reduce((sum, r) => sum + (r.data?.primary_bloom_level || 2), 0) / successful.length;

                // Count difficulties
                const diffCounts = { easy: 0, medium: 0, hard: 0 };
                difficulties.forEach(d => diffCounts[d]++);

                // Determine overall difficulty
                let overallDifficulty = 'medium';
                if (diffCounts.hard > diffCounts.medium && diffCounts.hard > diffCounts.easy) {
                    overallDifficulty = 'hard';
                } else if (diffCounts.easy > diffCounts.medium && diffCounts.easy > diffCounts.hard) {
                    overallDifficulty = 'easy';
                }

                // Teacher claim matches?
                const teacherClaim = quiz.difficulty || 'medium';
                const teacherHotsClaim = quiz.teacher_hots_claim || false;
                const aiSaysHots = hotsCount > questions.length / 2; // More than half are HOTS

                setOverallSummary({
                    overallDifficulty,
                    diffCounts,
                    avgBloom: avgBloom.toFixed(1),
                    hotsCount,
                    totalQuestions: questions.length,
                    difficultyMatch: teacherClaim === overallDifficulty,
                    hotsMatch: teacherHotsClaim === aiSaysHots,
                    teacherClaim,
                    teacherHotsClaim,
                    aiSaysHots
                });
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setError('Gagal menganalisis: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getDifficultyColor = (label) => {
        switch (label) {
            case 'easy': return 'bg-green-100 text-green-600';
            case 'hard': return 'bg-red-100 text-red-600';
            default: return 'bg-yellow-100 text-yellow-600';
        }
    };

    const getBloomLabel = (level) => {
        const labels = ['', 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
        return labels[level] || 'Unknown';
    };

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-text-main flex items-center gap-2">
                    🤖 AI Analysis
                </h3>
                <button
                    onClick={runAnalysis}
                    disabled={loading || !isConfigured}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Analyzing...
                        </span>
                    ) : (
                        '🔍 Analyze Quiz'
                    )}
                </button>
            </div>

            {!isConfigured && (
                <div className="p-3 bg-yellow-100 rounded-lg text-yellow-700 text-sm mb-4">
                    ⚠️ Gemini API key belum dikonfigurasi. Set NEXT_PUBLIC_GEMINI_API_KEY di .env.local
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-100 rounded-lg text-red-700 text-sm mb-4">
                    ❌ {error}
                </div>
            )}

            {/* Overall Summary */}
            {overallSummary && (
                <div className="bg-white rounded-lg p-4 mb-4 border border-purple-100">
                    <h4 className="font-bold text-text-main mb-3">📊 AI Summary</h4>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-text-muted mb-1">AI Difficulty</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getDifficultyColor(overallSummary.overallDifficulty)}`}>
                                {overallSummary.overallDifficulty.toUpperCase()}
                            </span>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-text-muted mb-1">Teacher Claim</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getDifficultyColor(overallSummary.teacherClaim)}`}>
                                {overallSummary.teacherClaim.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Difficulty Match:</span>
                            <span className={`font-semibold ${overallSummary.difficultyMatch ? 'text-green-600' : 'text-red-600'}`}>
                                {overallSummary.difficultyMatch ? '✅ Match' : '❌ Mismatch'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">HOTS Questions:</span>
                            <span className="font-semibold text-gray-800">{overallSummary.hotsCount} / {overallSummary.totalQuestions}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Teacher Claims HOTS:</span>
                            <span className="font-semibold text-gray-800">{overallSummary.teacherHotsClaim ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">AI Says HOTS:</span>
                            <span className={`font-semibold ${overallSummary.aiSaysHots === overallSummary.teacherHotsClaim ? 'text-green-600' : 'text-orange-600'}`}>
                                {overallSummary.aiSaysHots ? 'Yes' : 'No'}
                                {overallSummary.hotsMatch ? ' ✅' : ' ⚠️'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Avg Bloom Level:</span>
                            <span className="font-semibold text-gray-800">{overallSummary.avgBloom} ({getBloomLabel(Math.round(parseFloat(overallSummary.avgBloom)))})</span>
                        </div>
                    </div>

                    {/* Difficulty Distribution */}
                    <div className="mt-4">
                        <p className="text-xs text-text-muted mb-2">Difficulty Distribution:</p>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-600">
                                Easy: {overallSummary.diffCounts.easy}
                            </span>
                            <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-600">
                                Medium: {overallSummary.diffCounts.medium}
                            </span>
                            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-600">
                                Hard: {overallSummary.diffCounts.hard}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Per-Question Analysis */}
            {Object.keys(analyses).length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-bold text-text-main text-sm">Per-Question Analysis:</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {questions.map((q, idx) => {
                            const analysis = analyses[q.id || idx];
                            if (!analysis) return null;

                            return (
                                <div key={q.id || idx} className="bg-white rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-start justify-between">
                                        <span className="text-xs font-medium text-gray-500">Q{idx + 1}</span>
                                        {analysis.success ? (
                                            <div className="flex gap-1">
                                                <span className={`px-2 py-0.5 text-xs rounded ${getDifficultyColor(analysis.data.difficulty?.label || 'medium')}`}>
                                                    {analysis.data.difficulty?.label || 'medium'}
                                                </span>
                                                <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-600">
                                                    B{analysis.data.primary_bloom_level}
                                                </span>
                                                {analysis.data.hots?.flag && (
                                                    <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-600">
                                                        HOTS
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-red-500">Analysis failed</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-text-main mt-1 line-clamp-2">{q.prompt}</p>
                                    {analysis.success && analysis.data.difficulty?.reasons && (
                                        <p className="text-xs text-text-muted mt-1 italic">
                                            {analysis.data.difficulty.reasons.slice(0, 2).join('; ')}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {Object.keys(analyses).length === 0 && !loading && !error && (
                <div className="text-center py-6 text-text-muted">
                    <span className="text-3xl">🔍</span>
                    <p className="mt-2 text-sm">Klik "Analyze Quiz" untuk melihat opini AI tentang tingkat kesulitan quiz ini</p>
                </div>
            )}
        </div>
    );
}
