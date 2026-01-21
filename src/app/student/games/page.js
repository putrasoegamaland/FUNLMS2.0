'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useEnrollments, useAssessments } from '@/hooks/useSupabaseData';

function StudentGamesContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { awardXP } = useGame();
    const { data: enrollments, loading: enrollmentsLoading } = useEnrollments({ student_id: user?.id });
    const { data: allAssessments, loading: assessmentsLoading } = useAssessments();

    const [selectedGame, setSelectedGame] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [playCounts, setPlayCounts] = useState({});

    const isLoading = enrollmentsLoading || assessmentsLoading;

    // Get play count for a game
    const getPlayCount = (gameId) => {
        const key = `funlms_game_plays_${user?.id}_${gameId}`;
        if (typeof window !== 'undefined') {
            return parseInt(localStorage.getItem(key) || '0', 10);
        }
        return 0;
    };

    // Increment play count
    const incrementPlayCount = (gameId) => {
        const key = `funlms_game_plays_${user?.id}_${gameId}`;
        const current = getPlayCount(gameId);
        localStorage.setItem(key, String(current + 1));
        setPlayCounts(prev => ({ ...prev, [gameId]: current + 1 }));
    };

    // Check if game can be played
    const canPlayGame = (game) => {
        if (!game.max_plays || game.max_plays === 0) return true; // Unlimited
        const playCount = playCounts[game.id] || getPlayCount(game.id);
        return playCount < game.max_plays;
    };

    // Filter games for student's classes
    const games = useMemo(() => {
        const classIds = enrollments.map(e => e.class_id);
        return allAssessments.filter(a =>
            a.type === 'game' && (classIds.includes(a.class_id) || !a.class_id)
        );
    }, [enrollments, allAssessments]);

    // Load play counts when games change
    useEffect(() => {
        const counts = {};
        games.forEach(game => {
            counts[game.id] = getPlayCount(game.id);
        });
        setPlayCounts(counts);
    }, [games, user]);

    if (selectedGame && gameState) {
        return (
            <GamePlayer
                game={selectedGame}
                state={gameState}
                setState={setGameState}
                onComplete={(score, xp) => {
                    awardXP(xp, selectedGame.subject_id);
                    setSelectedGame(null);
                    setGameState(null);
                }}
                onExit={() => {
                    setSelectedGame(null);
                    setGameState(null);
                }}
            />
        );
    }

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading games...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold text-text-main">🎮 Fun Games</h2>

            {games.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                    {games.map((game) => {
                        const ICONS = {
                            match_pairs: '🎯',
                            sorting: '📊',
                            word_scramble: '🔤',
                            sequence: '📝',
                        };
                        const COLORS = ['bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-yellow-400'];
                        const colorIndex = game.id?.charCodeAt(0) % COLORS.length || 0;
                        const playCount = playCounts[game.id] || 0;
                        const hasLimit = game.max_plays && game.max_plays > 0;
                        const canPlay = canPlayGame(game);

                        return (
                            <button
                                key={game.id}
                                onClick={() => {
                                    if (!canPlay) return;
                                    incrementPlayCount(game.id);
                                    setSelectedGame(game);
                                    setGameState({ started: true, completed: false });
                                }}
                                disabled={!canPlay}
                                className={`${canPlay ? COLORS[colorIndex] : 'bg-gray-300'} rounded-2xl p-4 h-32 flex flex-col justify-between text-left transition-transform ${canPlay ? 'active:scale-95' : 'cursor-not-allowed opacity-70'}`}
                            >
                                <div className="text-3xl">{ICONS[game.game_type] || '🎮'}</div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">{game.title}</h3>
                                    <p className="text-xs text-white/80 capitalize">{game.game_type?.replace('_', ' ')}</p>
                                    {hasLimit && (
                                        <p className={`text-xs mt-1 ${canPlay ? 'text-white/80' : 'text-red-200'}`}>
                                            {canPlay ? `${game.max_plays - playCount} plays left` : 'No plays left'}
                                        </p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 text-text-muted">
                    <div className="text-4xl mb-4">🎮</div>
                    <p>No games available yet</p>
                    <p className="text-sm">Check back later!</p>
                </div>
            )}
        </div>
    );
}

function GamePlayer({ game, state, setState, onComplete, onExit }) {
    const [score, setScore] = useState(0);
    const [gameData, setGameData] = useState(null);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        // Initialize game data based on type
        if (game.gameType === 'match_pairs') {
            const items = game.gameData?.items || [];
            // Create shuffled cards
            const cards = [];
            items.forEach((item, i) => {
                cards.push({ id: `${i}-1`, pairId: i, content: item.text1 || item.image1, type: 'left', matched: false });
                cards.push({ id: `${i}-2`, pairId: i, content: item.text2 || item.image2, type: 'right', matched: false });
            });
            // Shuffle
            for (let i = cards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cards[i], cards[j]] = [cards[j], cards[i]];
            }
            setGameData({ cards, selected: null, matches: 0, total: items.length });
        } else if (game.gameType === 'word_scramble') {
            const words = Array.isArray(game.gameData) ? game.gameData : game.gameData?.items || [];
            setGameData({
                words: words.map(w => ({
                    ...w,
                    scrambled: w.word?.split('').sort(() => Math.random() - 0.5).join(''),
                    solved: false,
                })),
                current: 0,
                input: '',
            });
        } else if (game.gameType === 'sequence') {
            const items = Array.isArray(game.gameData) ? game.gameData : game.gameData?.items || [];
            const shuffled = [...items].sort(() => Math.random() - 0.5);
            setGameData({ items: shuffled, correct: items, placed: [] });
        } else if (game.gameType === 'sorting') {
            const items = game.gameData?.items || [];
            const shuffled = [...items].sort(() => Math.random() - 0.5);
            setGameData({
                categories: game.gameData?.categories || [],
                items: shuffled,
                placed: {},
                current: 0,
            });
        }
    }, [game]);

    // Match Pairs Game
    if (game.gameType === 'match_pairs' && gameData) {
        const handleCardClick = (card) => {
            if (card.matched || completed) return;

            if (!gameData.selected) {
                setGameData(prev => ({ ...prev, selected: card }));
            } else if (gameData.selected.id !== card.id) {
                if (gameData.selected.pairId === card.pairId) {
                    // Match!
                    const newCards = gameData.cards.map(c =>
                        c.pairId === card.pairId ? { ...c, matched: true } : c
                    );
                    const newMatches = gameData.matches + 1;
                    setGameData(prev => ({ ...prev, cards: newCards, selected: null, matches: newMatches }));
                    setScore(s => s + 10);

                    if (newMatches === gameData.total) {
                        setTimeout(() => setCompleted(true), 500);
                    }
                } else {
                    // No match, reset after delay
                    setTimeout(() => {
                        setGameData(prev => ({ ...prev, selected: null }));
                    }, 800);
                }
            }
        };

        return (
            <div className="min-h-screen bg-background-light p-4">
                <header className="flex items-center justify-between mb-4">
                    <button onClick={onExit}>
                        <span className="material-symbols-outlined text-text-muted">close</span>
                    </button>
                    <h2 className="font-bold text-text-main">{game.title}</h2>
                    <span className="font-bold text-primary">{score} pts</span>
                </header>

                {completed ? (
                    <GameComplete score={score} onComplete={() => onComplete(score, score)} />
                ) : (
                    <>
                        <p className="text-center text-text-muted mb-4">Match the pairs! {gameData.matches}/{gameData.total}</p>
                        <div className="grid grid-cols-3 gap-2">
                            {gameData.cards.map((card) => (
                                <button
                                    key={card.id}
                                    onClick={() => handleCardClick(card)}
                                    disabled={card.matched}
                                    className={`aspect-square rounded-xl flex items-center justify-center p-2 text-sm font-medium transition-all ${card.matched
                                        ? 'bg-green-100 text-green-600 border-2 border-green-300'
                                        : gameData.selected?.id === card.id
                                            ? 'bg-primary text-white'
                                            : 'bg-card-light border-2 border-gray-200 text-text-main hover:border-primary'
                                        }`}
                                >
                                    {card.content?.startsWith?.('data:image') ? (
                                        <img src={card.content} alt="" className="w-full h-full object-cover rounded" />
                                    ) : (
                                        card.content || '?'
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Word Scramble Game
    if (game.gameType === 'word_scramble' && gameData) {
        const currentWord = gameData.words[gameData.current];

        const checkAnswer = () => {
            if (gameData.input.toLowerCase() === currentWord.word.toLowerCase()) {
                const newWords = [...gameData.words];
                newWords[gameData.current] = { ...currentWord, solved: true };

                if (gameData.current + 1 >= gameData.words.length) {
                    setScore(s => s + 15);
                    setCompleted(true);
                } else {
                    setScore(s => s + 15);
                    setGameData(prev => ({ ...prev, words: newWords, current: prev.current + 1, input: '' }));
                }
            }
        };

        return (
            <div className="min-h-screen bg-background-light p-4">
                <header className="flex items-center justify-between mb-4">
                    <button onClick={onExit}>
                        <span className="material-symbols-outlined text-text-muted">close</span>
                    </button>
                    <h2 className="font-bold text-text-main">{game.title}</h2>
                    <span className="font-bold text-primary">{score} pts</span>
                </header>

                {completed ? (
                    <GameComplete score={score} onComplete={() => onComplete(score, score)} />
                ) : currentWord ? (
                    <div className="text-center space-y-6">
                        <p className="text-text-muted">Word {gameData.current + 1} of {gameData.words.length}</p>

                        <div className="bg-card-light rounded-2xl p-8">
                            <p className="text-3xl font-bold text-primary tracking-widest">{currentWord.scrambled?.toUpperCase()}</p>
                            {currentWord.hint && (
                                <p className="text-sm text-text-muted mt-2">Hint: {currentWord.hint}</p>
                            )}
                        </div>

                        <input
                            type="text"
                            value={gameData.input}
                            onChange={(e) => setGameData(prev => ({ ...prev, input: e.target.value }))}
                            placeholder="Type your answer..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none text-center text-lg"
                            onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                        />

                        <button
                            onClick={checkAnswer}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                        >
                            Check Answer
                        </button>
                    </div>
                ) : null}
            </div>
        );
    }

    // Sequence Game
    if (game.gameType === 'sequence' && gameData) {
        const handleItemClick = (item) => {
            const newPlaced = [...gameData.placed, item];
            const newItems = gameData.items.filter(i => i.id !== item.id);

            setGameData(prev => ({ ...prev, placed: newPlaced, items: newItems }));

            if (newItems.length === 0) {
                // Check order
                const correct = gameData.correct.every((c, i) => newPlaced[i]?.id === c.id);
                setScore(correct ? 100 : 50);
                setCompleted(true);
            }
        };

        return (
            <div className="min-h-screen bg-background-light p-4">
                <header className="flex items-center justify-between mb-4">
                    <button onClick={onExit}>
                        <span className="material-symbols-outlined text-text-muted">close</span>
                    </button>
                    <h2 className="font-bold text-text-main">{game.title}</h2>
                    <span className="font-bold text-primary">{score} pts</span>
                </header>

                {completed ? (
                    <GameComplete score={score} onComplete={() => onComplete(score, score)} />
                ) : (
                    <div className="space-y-4">
                        <p className="text-center text-text-muted">Tap items in the correct order</p>

                        {/* Placed items */}
                        <div className="bg-card-light rounded-xl p-4 min-h-[100px] space-y-2">
                            <p className="text-xs text-text-muted">Your sequence:</p>
                            {gameData.placed.map((item, i) => (
                                <div key={item.id} className="flex items-center gap-2 p-2 bg-green-100 rounded-lg">
                                    <span className="font-bold text-green-600">{i + 1}.</span>
                                    <span className="text-green-700">{item.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Available items */}
                        <div className="space-y-2">
                            <p className="text-xs text-text-muted">Tap to add:</p>
                            {gameData.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className="w-full p-3 bg-card-light border-2 border-gray-200 rounded-xl text-left hover:border-primary"
                                >
                                    {item.text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Sorting Game
    if (game.gameType === 'sorting' && gameData) {
        const currentItem = gameData.items[gameData.current];

        const handleCategoryClick = (category) => {
            if (!currentItem) return;

            const correct = currentItem.category === category;
            if (correct) setScore(s => s + 10);

            const newPlaced = { ...gameData.placed };
            if (!newPlaced[category]) newPlaced[category] = [];
            newPlaced[category].push({ ...currentItem, correct });

            if (gameData.current + 1 >= gameData.items.length) {
                setGameData(prev => ({ ...prev, placed: newPlaced, current: prev.current + 1 }));
                setCompleted(true);
            } else {
                setGameData(prev => ({ ...prev, placed: newPlaced, current: prev.current + 1 }));
            }
        };

        return (
            <div className="min-h-screen bg-background-light p-4">
                <header className="flex items-center justify-between mb-4">
                    <button onClick={onExit}>
                        <span className="material-symbols-outlined text-text-muted">close</span>
                    </button>
                    <h2 className="font-bold text-text-main">{game.title}</h2>
                    <span className="font-bold text-primary">{score} pts</span>
                </header>

                {completed ? (
                    <GameComplete score={score} onComplete={() => onComplete(score, score)} />
                ) : currentItem ? (
                    <div className="space-y-6">
                        <p className="text-center text-text-muted">
                            Item {gameData.current + 1} of {gameData.items.length}
                        </p>

                        <div className="bg-card-light rounded-2xl p-6 text-center">
                            <p className="text-xl font-bold text-text-main">{currentItem.text}</p>
                        </div>

                        <p className="text-center text-text-muted">Which category?</p>

                        <div className="grid grid-cols-2 gap-3">
                            {gameData.categories.map((cat, i) => (
                                <button
                                    key={cat}
                                    onClick={() => handleCategoryClick(cat)}
                                    className={`p-4 rounded-xl font-bold text-white ${i === 0 ? 'bg-blue-500' : 'bg-purple-500'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

function GameComplete({ score, onComplete }) {
    return (
        <div className="text-center py-12 space-y-6">
            <div className="text-6xl animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-text-main">Great Job!</h2>
            <div className="bg-yellow-100 rounded-2xl p-6 inline-block">
                <p className="text-3xl font-bold text-yellow-600">+{score} XP</p>
            </div>
            <button
                onClick={onComplete}
                className="w-full max-w-xs mx-auto py-3 bg-primary text-white font-bold rounded-xl"
            >
                Continue
            </button>
        </div>
    );
}

export default function StudentGamesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <StudentGamesContent />
        </Suspense>
    );
}
