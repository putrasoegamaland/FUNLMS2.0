'use client';

import { useState, useEffect } from 'react';
import { useAIReview } from '@/hooks/useSupabaseData';

/**
 * AIReviewPanel - Displays AI QC analysis results for a question
 */
export default function AIReviewPanel({ questionId, initialData = null }) {
    const { data: aiReview, loading } = useAIReview(questionId);
    const review = initialData || aiReview;

    if (loading) {
        return (
            <div className="bg-card-light rounded-xl p-6 border border-gray-100">
                <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-text-muted">Loading AI analysis...</span>
                </div>
            </div>
        );
    }

    if (!review) {
        return (
            <div className="bg-card-light rounded-xl p-6 border border-gray-100">
                <div className="text-center py-8 text-gray-500">
                    <span className="text-3xl">🤖</span>
                    <p className="mt-2">No AI analysis available yet</p>
                    <p className="text-sm">Submit the question for AI review to see analysis</p>
                </div>
            </div>
        );
    }

    // Helper functions
    const getBloomLabel = (level) => {
        const labels = {
            1: 'Remember',
            2: 'Understand',
            3: 'Apply',
            4: 'Analyze',
            5: 'Evaluate',
            6: 'Create'
        };
        return labels[level] || level;
    };

    const getBloomColor = (level) => {
        if (level <= 2) return 'gray';
        if (level === 3) return 'blue';
        if (level === 4) return 'purple';
        if (level === 5) return 'orange';
        return 'green';
    };

    const getBoundednessDisplay = (b) => {
        const displays = {
            'B0': { label: 'Poor', color: 'red', desc: 'Missing info or ambiguous grading' },
            'B1': { label: 'Partial', color: 'yellow', desc: 'Some elements unclear' },
            'B2': { label: 'Good', color: 'green', desc: 'Well-defined question' }
        };
        return displays[b] || { label: b, color: 'gray', desc: '' };
    };

    const getHOTSDisplay = (strength) => {
        const displays = {
            'S0': { label: 'Weak', color: 'gray', desc: 'Appears HOTS but is recall/summary' },
            'S1': { label: 'Medium', color: 'yellow', desc: 'Has "explain why" but weak structure' },
            'S2': { label: 'Strong', color: 'green', desc: 'Explicit criteria/constraints required' }
        };
        return displays[strength] || { label: strength, color: 'gray', desc: '' };
    };

    const getConfidenceColor = (value) => {
        if (value >= 0.8) return 'green';
        if (value >= 0.65) return 'yellow';
        return 'red';
    };

    const boundedness = getBoundednessDisplay(review.boundedness);
    const hots = getHOTSDisplay(review.hots_strength);

    return (
        <div className="space-y-4">
            {/* Main Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Bloom Level */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🧠</span>
                        <span className="text-sm text-text-muted">Bloom Level</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold text-${getBloomColor(review.primary_bloom_level)}-600`}>
                            {review.primary_bloom_level}
                        </span>
                        <span className="font-medium">{getBloomLabel(review.primary_bloom_level)}</span>
                    </div>
                    {review.secondary_bloom_levels?.length > 0 && (
                        <p className="text-xs text-text-muted mt-1">
                            Also touches: {review.secondary_bloom_levels.map(l => getBloomLabel(l)).join(', ')}
                        </p>
                    )}
                </div>

                {/* HOTS */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🎯</span>
                        <span className="text-sm text-text-muted">HOTS</span>
                    </div>
                    {review.hots_flag ? (
                        <>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-sm font-medium bg-${hots.color}-100 text-${hots.color}-600`}>
                                    {hots.label}
                                </span>
                                <span className="text-green-600">✓ Yes</span>
                            </div>
                            <p className="text-xs text-text-muted mt-1">{hots.desc}</p>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">✗ Not HOTS</span>
                        </div>
                    )}
                </div>

                {/* Difficulty */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📊</span>
                        <span className="text-sm text-text-muted">Difficulty</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{review.difficulty_score}/10</span>
                        <span className={`px-2 py-0.5 rounded-full text-sm font-medium capitalize ${review.difficulty_label === 'easy' ? 'bg-green-100 text-green-600' :
                                review.difficulty_label === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                    'bg-red-100 text-red-600'
                            }`}>
                            {review.difficulty_label}
                        </span>
                    </div>
                    {review.difficulty_reasons?.length > 0 && (
                        <p className="text-xs text-text-muted mt-1">{review.difficulty_reasons.join(', ')}</p>
                    )}
                </div>

                {/* Boundedness */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📐</span>
                        <span className="text-sm text-text-muted">Boundedness</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-sm font-medium bg-${boundedness.color}-100 text-${boundedness.color}-600`}>
                            {review.boundedness}
                        </span>
                        <span className="font-medium">{boundedness.label}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{boundedness.desc}</p>
                </div>
            </div>

            {/* Quality Metrics */}
            <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                <h3 className="font-bold text-text-main mb-3 flex items-center gap-2">
                    <span>✨</span> Quality Metrics
                </h3>
                <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{review.clarity_score || 0}%</div>
                        <div className="text-xs text-text-muted">Clarity</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{review.subject_match_score || 0}%</div>
                        <div className="text-xs text-text-muted">Subject Match</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{review.topic_match_score || 0}%</div>
                        <div className="text-xs text-text-muted">Topic Match</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-2xl font-bold text-${getConfidenceColor(review.bloom_confidence)}-600`}>
                            {Math.round((review.bloom_confidence || 0) * 100)}%
                        </div>
                        <div className="text-xs text-text-muted">AI Confidence</div>
                    </div>
                </div>
            </div>

            {/* Flags */}
            {(review.ambiguity_flags?.length > 0 || review.missing_info_flags?.length > 0 || review.grade_fit_flags?.length > 0) && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                        <span>⚠️</span> Issues Detected
                    </h3>
                    <div className="space-y-2">
                        {review.ambiguity_flags?.map((flag, i) => (
                            <div key={`amb-${i}`} className="flex items-start gap-2 text-sm text-red-600">
                                <span>•</span>
                                <span><strong>Ambiguity:</strong> {flag}</span>
                            </div>
                        ))}
                        {review.missing_info_flags?.map((flag, i) => (
                            <div key={`miss-${i}`} className="flex items-start gap-2 text-sm text-red-600">
                                <span>•</span>
                                <span><strong>Missing Info:</strong> {flag}</span>
                            </div>
                        ))}
                        {review.grade_fit_flags?.map((flag, i) => (
                            <div key={`grade-${i}`} className="flex items-start gap-2 text-sm text-orange-600">
                                <span>•</span>
                                <span><strong>Grade Fit:</strong> {flag}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* HOTS Signals */}
            {review.hots_signals?.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
                        <span>💡</span> HOTS Signals Detected
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {review.hots_signals.map((signal, i) => (
                            <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-lg">
                                {signal}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Suggested Edits */}
            {review.suggested_edits?.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                        <span>✏️</span> Suggested Improvements
                    </h3>
                    <div className="space-y-3">
                        {review.suggested_edits.map((edit, i) => (
                            <div key={i} className="bg-white rounded-lg p-3 border border-blue-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-blue-800 capitalize">
                                        {edit.goal?.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{edit.change_summary}</p>
                                {edit.before && edit.after && (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="p-2 bg-red-50 rounded-lg">
                                            <div className="text-xs text-red-500 mb-1">Before:</div>
                                            <div className="text-red-700">{edit.before}</div>
                                        </div>
                                        <div className="p-2 bg-green-50 rounded-lg">
                                            <div className="text-xs text-green-500 mb-1">After:</div>
                                            <div className="text-green-700">{edit.after}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confidence Breakdown */}
            <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                <h3 className="font-bold text-text-main mb-3 flex items-center gap-2">
                    <span>🎰</span> AI Confidence Breakdown
                </h3>
                <div className="space-y-2">
                    {[
                        { label: 'Bloom Level', value: review.bloom_confidence },
                        { label: 'HOTS Detection', value: review.hots_confidence },
                        { label: 'Difficulty', value: review.difficulty_confidence },
                        { label: 'Boundedness', value: review.boundedness_confidence }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="text-sm text-text-muted w-32">{item.label}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full bg-${getConfidenceColor(item.value)}-500`}
                                    style={{ width: `${(item.value || 0) * 100}%` }}
                                ></div>
                            </div>
                            <span className={`text-sm font-medium text-${getConfidenceColor(item.value)}-600`}>
                                {Math.round((item.value || 0) * 100)}%
                            </span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-text-muted mt-3">
                    Confidence below 65% triggers admin review
                </p>
            </div>
        </div>
    );
}
