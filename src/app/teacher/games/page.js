'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import storage from '@/lib/storage';
import { processImage } from '@/lib/fileUtils';

const GAME_TEMPLATES = [
    {
        id: 'match_pairs',
        name: 'Match Pairs',
        icon: '🎯',
        description: 'Match images or words together',
        minPairs: 3,
        maxPairs: 8,
    },
    {
        id: 'sorting',
        name: 'Sorting Game',
        icon: '📊',
        description: 'Sort items into categories',
        minItems: 4,
        maxItems: 12,
    },
    {
        id: 'word_scramble',
        name: 'Word Scramble',
        icon: '🔤',
        description: 'Unscramble letters to form words',
        minWords: 3,
        maxWords: 10,
    },
    {
        id: 'sequence',
        name: 'Sequence Order',
        icon: '📝',
        description: 'Put items in the correct order',
        minItems: 3,
        maxItems: 8,
    },
];

export default function TeacherGamesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState('list'); // list, select, create, preview
    const [games, setGames] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [previewGame, setPreviewGame] = useState(null);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = () => {
        const allGames = storage.assessments.getAll().filter(a =>
            a.type === 'game' && a.createdBy === user?.id
        );
        setGames(allGames);

        const allClasses = storage.classes.getAll();
        setClasses(allClasses.filter(c => c.teacherId === user?.id));

        setSubjects(storage.subjects.getAll());
    };

    const handleDelete = (gameId) => {
        if (confirm('Delete this game?')) {
            storage.assessments.delete(gameId);
            loadData();
        }
    };

    if (step === 'select') {
        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setStep('list')}>
                        <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold text-text-main">Choose Game Type</h2>
                </div>

                <div className="space-y-3">
                    {GAME_TEMPLATES.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => {
                                setSelectedTemplate(template);
                                setStep('create');
                            }}
                            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card-light border border-gray-100 hover:border-primary transition-colors text-left"
                        >
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl">
                                {template.icon}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-text-main">{template.name}</p>
                                <p className="text-sm text-text-muted">{template.description}</p>
                            </div>
                            <span className="material-symbols-outlined text-text-muted">chevron_right</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (step === 'create') {
        return (
            <GameCreator
                template={selectedTemplate}
                classes={classes}
                subjects={subjects}
                userId={user?.id}
                onBack={() => setStep('select')}
                onSave={() => {
                    loadData();
                    setStep('list');
                }}
            />
        );
    }

    if (step === 'preview' && previewGame) {
        const template = GAME_TEMPLATES.find(t => t.id === previewGame.gameType);
        return (
            <GamePreview
                game={previewGame}
                template={template}
                onBack={() => {
                    setPreviewGame(null);
                    setStep('list');
                }}
            />
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-main">🎮 My Games</h2>
            </div>

            {/* Games List */}
            {games.length > 0 ? (
                <div className="space-y-3">
                    {games.map((game) => {
                        const template = GAME_TEMPLATES.find(t => t.id === game.gameType);
                        return (
                            <div
                                key={game.id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-card-light border border-gray-100"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                                    {template?.icon || '🎮'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-text-main">{game.title}</p>
                                    <p className="text-sm text-text-muted">{template?.name}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setPreviewGame(game);
                                        setStep('preview');
                                    }}
                                    className="p-2 hover:bg-blue-50 rounded-lg"
                                >
                                    <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 20 }}>visibility</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(game.id)}
                                    className="p-2 hover:bg-red-50 rounded-lg"
                                >
                                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>delete</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 text-text-muted">
                    <div className="text-4xl mb-4">🎮</div>
                    <p>No games created yet</p>
                    <p className="text-sm">Create your first game!</p>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => setStep('select')}
                className="fixed bottom-24 right-4 flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-full shadow-lg font-bold"
            >
                <span className="material-symbols-outlined">add</span>
                Create Game
            </button>
        </div>
    );
}

function GameCreator({ template, classes, subjects, userId, onBack, onSave }) {
    // Initialize gameData based on template type
    const getInitialGameData = () => {
        switch (template.id) {
            case 'match_pairs':
                return { items: [{ id: '1', text1: '', text2: '', image1: null, image2: null }] };
            case 'sorting':
                return { categories: ['Category A', 'Category B'], items: [] };
            case 'word_scramble':
                return { items: [{ id: '1', word: '', hint: '' }] };
            case 'sequence':
                return { items: [{ id: '1', text: '', order: 1 }] };
            default:
                return { items: [] };
        }
    };

    const [formData, setFormData] = useState({
        title: '',
        subjectId: '',
        classIds: [],
        gameType: template.id,
        gameData: getInitialGameData(),
    });

    // Safely get items array
    const getItems = () => {
        if (!formData.gameData) return [];
        if (Array.isArray(formData.gameData)) return formData.gameData;
        if (Array.isArray(formData.gameData.items)) return formData.gameData.items;
        return [];
    };

    const addItem = () => {
        const newId = crypto.randomUUID();
        const currentItems = getItems();

        if (template.id === 'match_pairs') {
            setFormData(prev => ({
                ...prev,
                gameData: {
                    ...prev.gameData,
                    items: [...currentItems, { id: newId, text1: '', text2: '', image1: null, image2: null }],
                },
            }));
        } else if (template.id === 'word_scramble') {
            setFormData(prev => ({
                ...prev,
                gameData: {
                    ...prev.gameData,
                    items: [...currentItems, { id: newId, word: '', hint: '' }],
                },
            }));
        } else if (template.id === 'sequence') {
            setFormData(prev => ({
                ...prev,
                gameData: {
                    ...prev.gameData,
                    items: [...currentItems, { id: newId, text: '', order: currentItems.length + 1 }],
                },
            }));
        }
    };

    const updateItem = (index, updates) => {
        const items = [...getItems()];
        items[index] = { ...items[index], ...updates };
        setFormData(prev => ({
            ...prev,
            gameData: { ...prev.gameData, items },
        }));
    };

    const handleImageUpload = async (index, field, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const result = await processImage(file);
        if (result.success) {
            updateItem(index, { [field]: result.data });
        } else {
            alert(result.error);
        }
    };

    const handleSubmit = () => {
        const game = {
            ...formData,
            type: 'game',
            createdBy: userId,
        };
        storage.assessments.create(game);
        onSave();
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack}>
                    <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold text-text-main">Create {template.name}</h2>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Game Title</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Animal Match"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Subject</label>
                    <select
                        value={formData.subjectId}
                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                    >
                        <option value="">Select subject</option>
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Match Pairs Editor */}
                {template.id === 'match_pairs' && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-text-main">🎯 Pairs</h3>
                        {getItems().map((item, i) => (
                            <div key={item.id} className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-text-muted">Pair {i + 1}</span>
                                    <button
                                        onClick={() => {
                                            const items = getItems().filter((_, idx) => idx !== i);
                                            setFormData(prev => ({ ...prev, gameData: { ...prev.gameData, items } }));
                                        }}
                                        className="text-red-500"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <input
                                            type="text"
                                            value={item.text1}
                                            onChange={(e) => updateItem(i, { text1: e.target.value })}
                                            placeholder="Left item"
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                        />
                                        {item.image1 ? (
                                            <div className="mt-2 relative">
                                                <img src={item.image1} alt="" className="h-16 rounded" />
                                                <button
                                                    onClick={() => updateItem(i, { image1: null })}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                                                >×</button>
                                            </div>
                                        ) : (
                                            <label className="mt-2 flex items-center gap-1 text-xs text-primary cursor-pointer">
                                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_photo_alternate</span>
                                                Add image
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(i, 'image1', e)} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={item.text2}
                                            onChange={(e) => updateItem(i, { text2: e.target.value })}
                                            placeholder="Right item (match)"
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                        />
                                        {item.image2 ? (
                                            <div className="mt-2 relative">
                                                <img src={item.image2} alt="" className="h-16 rounded" />
                                                <button
                                                    onClick={() => updateItem(i, { image2: null })}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                                                >×</button>
                                            </div>
                                        ) : (
                                            <label className="mt-2 flex items-center gap-1 text-xs text-primary cursor-pointer">
                                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_photo_alternate</span>
                                                Add image
                                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(i, 'image2', e)} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {getItems().length < template.maxPairs && (
                            <button
                                onClick={addItem}
                                className="w-full py-3 border-2 border-dashed border-primary text-primary rounded-xl font-medium text-sm"
                            >
                                + Add Pair
                            </button>
                        )}
                    </div>
                )}

                {/* Word Scramble Editor */}
                {template.id === 'word_scramble' && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-text-main">🔤 Words</h3>
                        {getItems().map((item, i) => (
                            <div key={item.id} className="flex gap-2">
                                <input
                                    type="text"
                                    value={item.word}
                                    onChange={(e) => updateItem(i, { word: e.target.value })}
                                    placeholder="Word"
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                />
                                <input
                                    type="text"
                                    value={item.hint}
                                    onChange={(e) => updateItem(i, { hint: e.target.value })}
                                    placeholder="Hint (optional)"
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                />
                            </div>
                        ))}
                        <button
                            onClick={addItem}
                            className="w-full py-3 border-2 border-dashed border-primary text-primary rounded-xl font-medium text-sm"
                        >
                            + Add Word
                        </button>
                    </div>
                )}

                {/* Sequence Editor */}
                {template.id === 'sequence' && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-text-main">📝 Items (in correct order)</h3>
                        {getItems().map((item, i) => (
                            <div key={item.id} className="flex gap-2">
                                <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-bold text-text-muted">{i + 1}</span>
                                <input
                                    type="text"
                                    value={item.text}
                                    onChange={(e) => updateItem(i, { text: e.target.value })}
                                    placeholder={`Step ${i + 1}`}
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                />
                            </div>
                        ))}
                        <button
                            onClick={addItem}
                            className="w-full py-3 border-2 border-dashed border-primary text-primary rounded-xl font-medium text-sm"
                        >
                            + Add Item
                        </button>
                    </div>
                )}

                {/* Sorting Editor */}
                {template.id === 'sorting' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-text-main mb-2">📊 Categories</h3>
                            <div className="flex gap-2">
                                {formData.gameData.categories?.map((cat, i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        value={cat}
                                        onChange={(e) => {
                                            const categories = [...formData.gameData.categories];
                                            categories[i] = e.target.value;
                                            setFormData(prev => ({
                                                ...prev,
                                                gameData: { ...prev.gameData, categories }
                                            }));
                                        }}
                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-text-main mb-2">Items to Sort</h3>
                            {formData.gameData.items?.map((item, i) => (
                                <div key={item.id} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={item.text}
                                        onChange={(e) => {
                                            const items = [...formData.gameData.items];
                                            items[i] = { ...items[i], text: e.target.value };
                                            setFormData(prev => ({
                                                ...prev,
                                                gameData: { ...prev.gameData, items }
                                            }));
                                        }}
                                        placeholder="Item name"
                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                    />
                                    <select
                                        value={item.category || ''}
                                        onChange={(e) => {
                                            const items = [...formData.gameData.items];
                                            items[i] = { ...items[i], category: e.target.value };
                                            setFormData(prev => ({
                                                ...prev,
                                                gameData: { ...prev.gameData, items }
                                            }));
                                        }}
                                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                    >
                                        <option value="">Correct category</option>
                                        {formData.gameData.categories?.map((cat, idx) => (
                                            <option key={idx} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newId = crypto.randomUUID();
                                    setFormData(prev => ({
                                        ...prev,
                                        gameData: {
                                            ...prev.gameData,
                                            items: [...(prev.gameData.items || []), { id: newId, text: '', category: '' }]
                                        }
                                    }));
                                }}
                                className="w-full py-3 border-2 border-dashed border-primary text-primary rounded-xl font-medium text-sm"
                            >
                                + Add Item
                            </button>
                        </div>
                    </div>
                )}

                {/* Class Assignment */}
                <div>
                    <label className="block text-sm font-medium text-text-main mb-2">Assign to Classes</label>
                    <div className="flex flex-wrap gap-2">
                        {classes.map((cls) => (
                            <button
                                key={cls.id}
                                onClick={() => {
                                    const newIds = formData.classIds.includes(cls.id)
                                        ? formData.classIds.filter(id => id !== cls.id)
                                        : [...formData.classIds, cls.id];
                                    setFormData({ ...formData, classIds: newIds });
                                }}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium ${formData.classIds.includes(cls.id)
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-text-muted'
                                    }`}
                            >
                                {cls.name}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                >
                    Create Game
                </button>
            </div>
        </div>
    );
}

// Game Preview Component
function GamePreview({ game, template, onBack }) {
    const [flippedCards, setFlippedCards] = useState([]);
    const [matchedPairs, setMatchedPairs] = useState([]);
    const [sortedItems, setSortedItems] = useState({});
    const [scrambleGuess, setScrambleGuess] = useState('');
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [sequenceOrder, setSequenceOrder] = useState([]);

    const getItems = () => {
        if (game.gameType === 'sorting') {
            return game.gameData?.items || [];
        }
        return game.gameData?.items || game.gameData || [];
    };

    const items = getItems();

    // Match Pairs Preview
    const renderMatchPairs = () => {
        const cards = items.flatMap((item, i) => [
            { id: `${i}-a`, pairId: i, content: item.text || item.word, type: 'text' },
            { id: `${i}-b`, pairId: i, content: item.match || item.image, type: item.image ? 'image' : 'text' },
        ]).sort(() => Math.random() - 0.5);

        const handleFlip = (card) => {
            if (matchedPairs.includes(card.pairId)) return;
            if (flippedCards.length === 2) return;

            const newFlipped = [...flippedCards, card];
            setFlippedCards(newFlipped);

            if (newFlipped.length === 2) {
                if (newFlipped[0].pairId === newFlipped[1].pairId) {
                    setMatchedPairs([...matchedPairs, newFlipped[0].pairId]);
                }
                setTimeout(() => setFlippedCards([]), 1000);
            }
        };

        return (
            <div className="grid grid-cols-4 gap-2">
                {cards.map((card) => {
                    const isFlipped = flippedCards.some(f => f.id === card.id);
                    const isMatched = matchedPairs.includes(card.pairId);

                    return (
                        <button
                            key={card.id}
                            onClick={() => handleFlip(card)}
                            className={`aspect-square rounded-xl flex items-center justify-center text-sm p-2 transition-all ${isMatched ? 'bg-green-100 border-2 border-green-500' :
                                    isFlipped ? 'bg-white border-2 border-primary' :
                                        'bg-primary/20 border-2 border-transparent'
                                }`}
                        >
                            {isFlipped || isMatched ? (
                                card.type === 'image' && card.content ? (
                                    <img src={card.content} className="w-full h-full object-contain rounded" />
                                ) : (
                                    <span className="text-center break-words">{card.content}</span>
                                )
                            ) : (
                                <span className="text-2xl">❓</span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    // Sorting Game Preview
    const renderSorting = () => {
        const categories = game.gameData?.categories || ['Category 1', 'Category 2'];

        return (
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {items.filter(item => !Object.values(sortedItems).flat().includes(item.text)).map((item, i) => (
                        <div
                            key={i}
                            draggable
                            className="px-3 py-2 bg-yellow-100 rounded-lg text-sm font-medium cursor-move"
                        >
                            {item.text || item.word}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {categories.map((cat, i) => (
                        <div
                            key={i}
                            onClick={() => {
                                const unsorted = items.filter(item => !Object.values(sortedItems).flat().includes(item.text));
                                if (unsorted.length > 0) {
                                    setSortedItems({
                                        ...sortedItems,
                                        [cat]: [...(sortedItems[cat] || []), unsorted[0].text]
                                    });
                                }
                            }}
                            className="p-3 border-2 border-dashed border-gray-300 rounded-xl min-h-[100px]"
                        >
                            <p className="font-bold text-text-main mb-2">{cat}</p>
                            <div className="flex flex-wrap gap-1">
                                {(sortedItems[cat] || []).map((item, j) => (
                                    <span key={j} className="px-2 py-1 bg-primary/20 rounded text-xs">{item}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Word Scramble Preview
    const renderWordScramble = () => {
        const currentWord = items[currentWordIndex];
        if (!currentWord) return null;

        const word = currentWord.word || currentWord.text || '';
        const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');

        return (
            <div className="text-center space-y-4">
                <div className="text-3xl font-mono bg-gray-100 p-4 rounded-xl tracking-widest">
                    {scrambled.toUpperCase()}
                </div>
                <input
                    type="text"
                    value={scrambleGuess}
                    onChange={(e) => setScrambleGuess(e.target.value)}
                    placeholder="Type your answer..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-lg"
                />
                {scrambleGuess.toLowerCase() === word.toLowerCase() && (
                    <div className="text-green-600 font-bold">✅ Correct!</div>
                )}
                <div className="text-sm text-text-muted">
                    Word {currentWordIndex + 1} of {items.length}
                </div>
                <div className="flex gap-2 justify-center">
                    <button
                        onClick={() => {
                            setCurrentWordIndex(Math.max(0, currentWordIndex - 1));
                            setScrambleGuess('');
                        }}
                        disabled={currentWordIndex === 0}
                        className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
                    >Previous</button>
                    <button
                        onClick={() => {
                            setCurrentWordIndex(Math.min(items.length - 1, currentWordIndex + 1));
                            setScrambleGuess('');
                        }}
                        disabled={currentWordIndex === items.length - 1}
                        className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
                    >Next</button>
                </div>
            </div>
        );
    };

    // Sequence Preview
    const renderSequence = () => {
        const shuffled = [...items].sort(() => Math.random() - 0.5);

        return (
            <div className="space-y-4">
                <p className="text-sm text-text-muted text-center">Click items in the correct order:</p>
                <div className="space-y-2">
                    {shuffled.map((item, i) => {
                        const orderIndex = sequenceOrder.indexOf(i);
                        const isSelected = orderIndex !== -1;

                        return (
                            <button
                                key={i}
                                onClick={() => {
                                    if (isSelected) {
                                        setSequenceOrder(sequenceOrder.filter(o => o !== i));
                                    } else {
                                        setSequenceOrder([...sequenceOrder, i]);
                                    }
                                }}
                                className={`w-full p-3 rounded-xl text-left flex items-center gap-3 ${isSelected ? 'bg-primary text-white' : 'bg-gray-100'
                                    }`}
                            >
                                {isSelected && (
                                    <span className="w-6 h-6 bg-white text-primary rounded-full flex items-center justify-center text-sm font-bold">
                                        {orderIndex + 1}
                                    </span>
                                )}
                                <span>{item.text || item.step}</span>
                            </button>
                        );
                    })}
                </div>
                {sequenceOrder.length === items.length && (
                    <button
                        onClick={() => setSequenceOrder([])}
                        className="w-full py-2 bg-gray-200 rounded-lg text-sm"
                    >Reset Order</button>
                )}
            </div>
        );
    };

    const renderGameContent = () => {
        switch (game.gameType) {
            case 'match_pairs': return renderMatchPairs();
            case 'sorting': return renderSorting();
            case 'word_scramble': return renderWordScramble();
            case 'sequence': return renderSequence();
            default: return <div>Unknown game type</div>;
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack}>
                    <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                </button>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-text-main">{game.title}</h2>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        👁️ Preview Mode
                    </span>
                </div>
            </div>

            {/* Game Info */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                    <span className="text-4xl">{template?.icon}</span>
                    <div>
                        <p className="font-bold text-text-main">{template?.name}</p>
                        <p className="text-sm text-text-muted">{items.length} items</p>
                    </div>
                </div>
            </div>

            {/* Game Content */}
            <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                {renderGameContent()}
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200 text-sm text-yellow-700">
                <strong>📝 Preview Mode:</strong> This is how students will see the game.
                Try interacting with it to test the experience!
            </div>
        </div>
    );
}

