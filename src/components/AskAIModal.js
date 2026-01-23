'use client';

import { useState, useRef, useEffect } from 'react';
import { askAboutMaterial, isGeminiConfigured } from '@/lib/geminiAI';

/**
 * Modal/Embedded component for students to ask AI questions about learning materials
 * Can be used as a modal popup or embedded in a sidebar
 */
export default function AskAIModal({ isOpen, onClose, material, embedded = false }) {
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [questionsAsked, setQuestionsAsked] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const MAX_QUESTIONS = 10; // Rate limit per session

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleAsk = async () => {
        if (!question.trim() || loading || questionsAsked >= MAX_QUESTIONS) return;

        const userQuestion = question.trim();
        setQuestion('');
        setLoading(true);

        // Add user message
        setMessages(prev => [...prev, { type: 'user', text: userQuestion }]);

        try {
            const response = await askAboutMaterial(userQuestion, material);
            setMessages(prev => [...prev, { type: 'ai', text: response }]);
            setQuestionsAsked(prev => prev + 1);
        } catch (error) {
            setMessages(prev => [...prev, {
                type: 'ai',
                text: "🤖 Oops! Something went wrong. Try asking again!"
            }]);
        }

        setLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAsk();
        }
    };

    if (!isOpen) return null;

    const remainingQuestions = MAX_QUESTIONS - questionsAsked;

    // Chat content (used in both modal and embedded modes)
    const chatUI = (
        <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">🤔</div>
                        <p className="text-text-main font-medium mb-2">
                            What would you like to know?
                        </p>
                        <p className="text-sm text-text-muted">
                            Ask me anything about &quot;{material?.title || 'this topic'}&quot;!
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            {[
                                "What is this about?",
                                "Can you explain more?",
                                "Why is this important?",
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setQuestion(suggestion)}
                                    className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full hover:bg-primary/20 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] p-3 rounded-2xl ${msg.type === 'user'
                                        ? 'bg-primary text-white rounded-br-md'
                                        : 'bg-gray-100 text-text-main rounded-bl-md'
                                        }`}
                                >
                                    {msg.type === 'ai' && (
                                        <span className="text-lg mr-1">🤖</span>
                                    )}
                                    <span className="text-sm">{msg.text}</span>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-md">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🤖</span>
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100">
                {remainingQuestions > 0 ? (
                    <>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your question..."
                                disabled={loading}
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm disabled:bg-gray-50 bg-white text-gray-900"
                            />
                            <button
                                onClick={handleAsk}
                                disabled={!question.trim() || loading}
                                className="px-4 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                            </button>
                        </div>
                        <p className="text-xs text-text-muted text-center mt-2">
                            {remainingQuestions} questions remaining in this session
                        </p>
                    </>
                ) : (
                    <div className="text-center py-2">
                        <p className="text-sm text-orange-600 font-medium">
                            🌟 You&apos;ve asked a lot of great questions!
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                            Come back later to ask more, or ask your teacher!
                        </p>
                    </div>
                )}
            </div>
        </>
    );

    // Embedded mode - just return the chat UI without modal wrapper
    if (embedded) {
        return (
            <div className="flex flex-col h-full bg-white">
                {chatUI}
            </div>
        );
    }

    // Modal mode - wrap in modal container
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-3xl flex flex-col max-h-[85vh] sm:max-h-[600px]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-xl">🤖</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-text-main">Ask AI Helper</h3>
                            <p className="text-xs text-text-muted">
                                Learning about: {material?.title || 'General'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined text-text-muted">close</span>
                    </button>
                </div>

                {chatUI}
            </div>
        </div>
    );
}
