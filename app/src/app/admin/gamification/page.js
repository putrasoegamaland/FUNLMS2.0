'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import storage from '@/lib/storage';
import { defaultXPConfig, defaultBadges, conditionTypes } from '@/config/gamification';

export default function AdminGamificationPage() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('xp');
    const [xpConfig, setXpConfig] = useState(defaultXPConfig);
    const [badges, setBadges] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [editingBadge, setEditingBadge] = useState(null);
    const [editingSubject, setEditingSubject] = useState(null);

    useEffect(() => {
        const savedConfig = storage.gamificationConfig.get();
        setXpConfig(savedConfig);

        const savedBadges = storage.badges.getAll();
        setBadges(savedBadges.length > 0 ? savedBadges : defaultBadges);

        const savedSubjects = storage.subjects.getAll();
        setSubjects(savedSubjects);
    }, []);

    const handleSaveXP = () => {
        storage.gamificationConfig.set(xpConfig);
        alert('XP settings saved!');
    };

    const handleToggleBadge = (badgeId) => {
        const badge = badges.find(b => b.id === badgeId);
        if (badge) {
            storage.badges.update(badgeId, { isActive: !badge.isActive });
            setBadges(storage.badges.getAll());
        }
    };

    const handleDeleteBadge = (badgeId) => {
        if (confirm('Are you sure you want to delete this badge?')) {
            storage.badges.delete(badgeId);
            setBadges(storage.badges.getAll());
        }
    };

    const handleDeleteSubject = (subjectId) => {
        if (confirm('Are you sure you want to delete this subject?')) {
            storage.subjects.delete(subjectId);
            setSubjects(storage.subjects.getAll());
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="text-center py-4">
                <div className="text-4xl mb-2">🎮</div>
                <h2 className="text-xl font-bold text-text-main">Gamification Settings</h2>
                <p className="text-sm text-text-muted">Configure XP rules and badges</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                <button
                    onClick={() => setActiveTab('xp')}
                    className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'xp' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted'
                        }`}
                >
                    ⭐ XP
                </button>
                <button
                    onClick={() => setActiveTab('badges')}
                    className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'badges' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted'
                        }`}
                >
                    🏆 Badges
                </button>
                <button
                    onClick={() => setActiveTab('subjects')}
                    className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'subjects' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted'
                        }`}
                >
                    📚 Subjects
                </button>
            </div>

            {/* XP Settings Tab */}
            {activeTab === 'xp' && (
                <div className="space-y-4">
                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-text-main mb-4">XP Rewards</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-text-muted">XP per correct answer</span>
                                    <span className="font-bold text-primary">{xpConfig.xpPerCorrect} XP</span>
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max="50"
                                    value={xpConfig.xpPerCorrect}
                                    onChange={(e) => setXpConfig({ ...xpConfig, xpPerCorrect: parseInt(e.target.value) })}
                                    className="w-full accent-primary"
                                />
                            </div>

                            <div>
                                <label className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-text-muted">Perfect score bonus</span>
                                    <span className="font-bold text-primary">{xpConfig.xpPerfectBonus} XP</span>
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={xpConfig.xpPerfectBonus}
                                    onChange={(e) => setXpConfig({ ...xpConfig, xpPerfectBonus: parseInt(e.target.value) })}
                                    className="w-full accent-primary"
                                />
                            </div>

                            <div>
                                <label className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-text-muted">XP per level</span>
                                    <span className="font-bold text-primary">{xpConfig.xpPerLevel} XP</span>
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="500"
                                    step="50"
                                    value={xpConfig.xpPerLevel}
                                    onChange={(e) => setXpConfig({ ...xpConfig, xpPerLevel: parseInt(e.target.value) })}
                                    className="w-full accent-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-text-main mb-4">🔥 Streak Bonuses</h3>
                        <div className="space-y-3">
                            {Object.entries(xpConfig.streakBonuses || {}).map(([days, multiplier]) => (
                                <div key={days} className="flex items-center justify-between">
                                    <span className="text-sm text-text-muted">{days}-day streak</span>
                                    <span className="font-bold text-orange-500">+{Math.round((multiplier - 1) * 100)}% XP</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSaveXP}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                    >
                        Save XP Settings
                    </button>
                </div>
            )}

            {/* Badges Tab */}
            {activeTab === 'badges' && (
                <div className="space-y-3">
                    {badges.map((badge) => (
                        <div
                            key={badge.id}
                            className={`flex items-center gap-3 p-4 rounded-xl border ${badge.isActive ? 'bg-card-light border-gray-100' : 'bg-gray-50 border-gray-200 opacity-60'
                                }`}
                        >
                            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-2xl">
                                {badge.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-text-main">{badge.name}</p>
                                <p className="text-xs text-text-muted truncate">{badge.description}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleToggleBadge(badge.id)}
                                    className={`p-2 rounded-lg ${badge.isActive ? 'bg-green-100' : 'bg-gray-200'}`}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: badge.isActive ? '#22c55e' : '#9ca3af' }}>
                                        {badge.isActive ? 'toggle_on' : 'toggle_off'}
                                    </span>
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingBadge(badge);
                                        setShowBadgeModal(true);
                                    }}
                                    className="p-2 rounded-lg hover:bg-gray-100"
                                >
                                    <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 20 }}>edit</span>
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add Badge Button */}
                    <button
                        onClick={() => {
                            setEditingBadge(null);
                            setShowBadgeModal(true);
                        }}
                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-text-muted font-medium hover:border-primary hover:text-primary transition-colors"
                    >
                        + Create New Badge
                    </button>
                </div>
            )}

            {/* Subjects Tab */}
            {activeTab === 'subjects' && (
                <div className="space-y-3">
                    {subjects.length === 0 ? (
                        <div className="text-center py-8 text-text-muted">
                            <div className="text-4xl mb-2">📚</div>
                            <p>No subjects yet</p>
                            <p className="text-sm">Add subjects for quizzes and analytics</p>
                        </div>
                    ) : (
                        subjects.map((subject) => (
                            <div
                                key={subject.id}
                                className="flex items-center gap-3 p-4 rounded-xl border bg-card-light border-gray-100"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                                    {subject.emoji || '📖'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-text-main">{subject.name}</p>
                                    <p className="text-xs text-text-muted">ID: {subject.id}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingSubject(subject);
                                            setShowSubjectModal(true);
                                        }}
                                        className="p-2 rounded-lg hover:bg-gray-100"
                                    >
                                        <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 20 }}>edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSubject(subject.id)}
                                        className="p-2 rounded-lg hover:bg-red-50"
                                    >
                                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>delete</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add Subject Button */}
                    <button
                        onClick={() => {
                            setEditingSubject(null);
                            setShowSubjectModal(true);
                        }}
                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-text-muted font-medium hover:border-primary hover:text-primary transition-colors"
                    >
                        + Add New Subject
                    </button>
                </div>
            )}

            {/* Badge Modal */}
            {showBadgeModal && (
                <BadgeModal
                    badge={editingBadge}
                    onClose={() => setShowBadgeModal(false)}
                    onSave={() => {
                        setBadges(storage.badges.getAll());
                        setShowBadgeModal(false);
                    }}
                />
            )}

            {/* Subject Modal */}
            {showSubjectModal && (
                <SubjectModal
                    subject={editingSubject}
                    onClose={() => setShowSubjectModal(false)}
                    onSave={() => {
                        setSubjects(storage.subjects.getAll());
                        setShowSubjectModal(false);
                    }}
                />
            )}
        </div>
    );
}

function BadgeModal({ badge, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: badge?.name || '',
        emoji: badge?.emoji || '🏆',
        description: badge?.description || '',
        condition: badge?.condition || { type: 'total_xp', value: 100 },
        isActive: badge?.isActive ?? true,
    });

    const emojis = ['🏆', '⭐', '🌟', '💯', '🔥', '📚', '🔢', '🔬', '✏️', '🎨', '🐦', '🦁', '🎯', '💎'];

    const handleSubmit = (e) => {
        e.preventDefault();

        if (badge) {
            storage.badges.update(badge.id, formData);
        } else {
            storage.badges.create(formData);
        }

        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
            <div className="w-full max-w-md bg-white rounded-t-3xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 shrink-0">
                    <h3 className="font-bold text-text-main">
                        {badge ? 'Edit Badge' : 'Create Badge'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Badge Icon</label>
                            <div className="flex flex-wrap gap-2">
                                {emojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, emoji })}
                                        className={`w-10 h-10 rounded-lg border-2 text-xl ${formData.emoji === emoji ? 'border-primary bg-primary/10' : 'border-gray-200'
                                            }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Badge Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Description</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Unlock Condition</label>
                            <select
                                value={formData.condition.type}
                                onChange={(e) => setFormData({ ...formData, condition: { ...formData.condition, type: e.target.value } })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                            >
                                <option value="total_xp">Total XP Earned</option>
                                <option value="quiz_count">Quizzes Completed</option>
                                <option value="streak">Day Streak</option>
                                <option value="level">Level Reached</option>
                                <option value="perfect_score">Perfect Scores</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Required Value</label>
                            <input
                                type="number"
                                value={formData.condition.value}
                                onChange={(e) => setFormData({ ...formData, condition: { ...formData.condition, value: parseInt(e.target.value) } })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Sticky Submit Button */}
                    <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                        <button
                            type="submit"
                            className="w-full py-3 bg-primary text-text-main font-bold rounded-xl hover:opacity-90 transition-opacity"
                        >
                            {badge ? 'Update Badge' : 'Create Badge'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function SubjectModal({ subject, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: subject?.name || '',
        emoji: subject?.emoji || '📚',
    });

    const emojis = ['📚', '💻', '🔢', '🎵', '🎨', '🔬', '🌍', '☕️', '🎯', '📝', '🧠', '💼', '❤️', '🏅'];

    const handleSubmit = (e) => {
        e.preventDefault();

        if (subject) {
            storage.subjects.update(subject.id, formData);
        } else {
            storage.subjects.create(formData);
        }

        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
            <div className="w-full max-w-md bg-white rounded-t-3xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 shrink-0">
                    <h3 className="font-bold text-text-main">
                        {subject ? 'Edit Subject' : 'Add Subject'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Subject Icon</label>
                            <div className="flex flex-wrap gap-2">
                                {emojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, emoji })}
                                        className={`w-10 h-10 rounded-lg border-2 text-xl ${formData.emoji === emoji ? 'border-primary bg-primary/10' : 'border-gray-200'
                                            }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Subject Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Mathematics, Science, Art"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Sticky Submit Button */}
                    <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                        <button
                            type="submit"
                            className="w-full py-3 bg-primary text-text-main font-bold rounded-xl hover:opacity-90 transition-opacity"
                        >
                            {subject ? 'Update Subject' : 'Add Subject'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
