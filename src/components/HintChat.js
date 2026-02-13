'use client';

import { useState, useEffect } from 'react';
import { requestHint, checkHintQuota, getHintTypes, isHintAIConfigured } from '@/lib/hintAI';

/**
 * HintChat - Student hint request interface with quota display
 */
export default function HintChat({
    studentId,
    questionId,
    attemptId = null,
    question,
    gradeBand = 'SMP',
    onHintReceived = null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [hints, setHints] = useState([]);
    const [quotaStatus, setQuotaStatus] = useState({ used: 0, remaining: 3, quota: 3 });
    const [isLoading, setIsLoading] = useState(false);
    const [customMessage, setCustomMessage] = useState('');
    const [error, setError] = useState(null);

    const hintTypes = getHintTypes();

    // Check quota on mount
    useEffect(() => {
        async function checkQuota() {
            if (studentId && questionId) {
                const status = await checkHintQuota(studentId, questionId, gradeBand);
                setQuotaStatus(status);
            }
        }
        checkQuota();
    }, [studentId, questionId, gradeBand]);

    const handleRequestHint = async (hintType) => {
        if (!quotaStatus.allowed && quotaStatus.remaining === 0) {
            setError('You have used all your hints for this question.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await requestHint(
                studentId,
                questionId,
                attemptId,
                question,
                hintType,
                customMessage,
                gradeBand
            );

            if (result.success) {
                const newHint = {
                    id: Date.now(),
                    type: hintType,
                    typeName: hintTypes.find(t => t.key === hintType)?.name || hintType,
                    icon: hintTypes.find(t => t.key === hintType)?.icon || '💡',
                    message: customMessage,
                    response: result.hint,
                    timestamp: new Date()
                };
                setHints([...hints, newHint]);
                setQuotaStatus(result.quotaStatus);
                setCustomMessage('');

                if (onHintReceived) {
                    onHintReceived(newHint);
                }
            } else {
                setError(result.message || 'Failed to get hint');
                if (result.quotaStatus) {
                    setQuotaStatus(result.quotaStatus);
                }
            }
        } catch (err) {
            console.error('Error requesting hint:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isHintAIConfigured()) {
        return null; // Don't show if AI not configured
    }

    return (
        <div className="relative">
            {/* Hint Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${isOpen
                        ? 'bg-primary text-white'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
            >
                <span className="text-lg">💡</span>
                <span>Need a Hint?</span>
                {quotaStatus.remaining > 0 && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                        {quotaStatus.remaining} left
                    </span>
                )}
            </button>

            {/* Hint Panel */}
            {isOpen && (
                <div className="absolute bottom-full mb-2 right-0 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-4 text-white">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <span>💡</span> AI Hint Helper
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm">
                            <div className="flex-1 bg-white/20 rounded-full h-2">
                                <div
                                    className="bg-white rounded-full h-2 transition-all"
                                    style={{ width: `${(quotaStatus.used / quotaStatus.quota) * 100}%` }}
                                ></div>
                            </div>
                            <span>{quotaStatus.remaining}/{quotaStatus.quota} hints remaining</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="max-h-80 overflow-y-auto">
                        {/* Previous hints */}
                        {hints.length > 0 && (
                            <div className="p-3 space-y-3 border-b">
                                {hints.map((hint) => (
                                    <div key={hint.id} className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                            <span>{hint.icon}</span>
                                            <span className="font-medium">{hint.typeName}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{hint.response}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error display */}
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Hint types */}
                        {quotaStatus.remaining > 0 ? (
                            <div className="p-3 space-y-2">
                                <p className="text-xs text-gray-500 mb-2">Select a hint type:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {hintTypes.map((type) => (
                                        <button
                                            key={type.key}
                                            onClick={() => handleRequestHint(type.key)}
                                            disabled={isLoading}
                                            className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                                        >
                                            <span className="text-2xl mb-1">{type.icon}</span>
                                            <span className="text-xs font-medium text-center">{type.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Custom question */}
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-gray-500 mb-2">Or ask a specific question:</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customMessage}
                                            onChange={(e) => setCustomMessage(e.target.value)}
                                            placeholder="I'm stuck on..."
                                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary outline-none"
                                            disabled={isLoading}
                                        />
                                        <button
                                            onClick={() => handleRequestHint('socratic')}
                                            disabled={isLoading || !customMessage.trim()}
                                            className="px-3 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                                        >
                                            {isLoading ? '...' : 'Ask'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center">
                                <span className="text-3xl">🎯</span>
                                <p className="mt-2 font-medium text-gray-700">No hints remaining!</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    You've used all your hints. Try your best to solve this one!
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm text-gray-600">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
