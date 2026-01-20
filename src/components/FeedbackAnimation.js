'use client';

import { useEffect, useState } from 'react';

/**
 * Animated feedback component for quiz answers
 * Shows correct/incorrect feedback with animations
 */
export function FeedbackAnimation({ isCorrect, xpEarned, onComplete }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onComplete?.();
        }, 1500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className={`animate-bounce-in text-center ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                {/* Icon */}
                <div className={`text-8xl mb-4 ${isCorrect ? 'animate-pulse' : 'animate-shake'}`}>
                    {isCorrect ? '✅' : '❌'}
                </div>

                {/* Text */}
                <p className={`text-2xl font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {isCorrect ? 'Correct!' : 'Not quite...'}
                </p>

                {/* XP popup */}
                {isCorrect && xpEarned && (
                    <div className="mt-4 animate-float-up">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full font-bold text-lg">
                            ⭐ +{xpEarned} XP
                        </span>
                    </div>
                )}
            </div>

            {/* Confetti effect for correct answers */}
            {isCorrect && (
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-20px',
                                animationDelay: `${Math.random() * 0.5}s`,
                                fontSize: `${20 + Math.random() * 20}px`,
                            }}
                        >
                            {['🎉', '⭐', '🌟', '✨', '💫'][Math.floor(Math.random() * 5)]}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// CSS animations to be added to globals.css
export const feedbackAnimationStyles = `
@keyframes bounce-in {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-10px); }
    40% { transform: translateX(10px); }
    60% { transform: translateX(-10px); }
    80% { transform: translateX(10px); }
}

@keyframes float-up {
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-20px); opacity: 0.8; }
}

@keyframes confetti {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

.animate-bounce-in {
    animation: bounce-in 0.5s ease-out forwards;
}

.animate-shake {
    animation: shake 0.5s ease-in-out;
}

.animate-float-up {
    animation: float-up 1.5s ease-out forwards;
}

.animate-confetti {
    animation: confetti 2s ease-in-out forwards;
}
`;

export default FeedbackAnimation;
