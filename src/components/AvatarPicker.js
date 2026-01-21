'use client';

import { useState } from 'react';

const AVATARS = [
    { id: 'lion', emoji: '🦁', name: 'Leo the Lion' },
    { id: 'panda', emoji: '🐼', name: 'Panda' },
    { id: 'fox', emoji: '🦊', name: 'Foxy' },
    { id: 'rabbit', emoji: '🐰', name: 'Bunny' },
    { id: 'frog', emoji: '🐸', name: 'Froggy' },
    { id: 'unicorn', emoji: '🦄', name: 'Sparkle' },
    { id: 'tiger', emoji: '🐯', name: 'Tiger' },
    { id: 'koala', emoji: '🐨', name: 'Koala' },
    { id: 'butterfly', emoji: '🦋', name: 'Flutter' },
    { id: 'star', emoji: '🌟', name: 'Starry' },
    { id: 'cat', emoji: '🐱', name: 'Kitty' },
    { id: 'dog', emoji: '🐶', name: 'Puppy' },
    { id: 'bear', emoji: '🐻', name: 'Teddy' },
    { id: 'penguin', emoji: '🐧', name: 'Penguin' },
    { id: 'owl', emoji: '🦉', name: 'Owly' },
    { id: 'dragon', emoji: '🐲', name: 'Dragon' },
];

export function AvatarPicker({ isOpen, onClose, currentAvatar, onSelect }) {
    const [selected, setSelected] = useState(currentAvatar || 'lion');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onSelect(selected);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-scale-in">
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-text-main">Choose Your Avatar</h3>
                    <p className="text-sm text-text-muted">Pick a character that represents you!</p>
                </div>

                {/* Preview */}
                <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center text-5xl shadow-lg">
                        {AVATARS.find(a => a.id === selected)?.emoji || '🦁'}
                    </div>
                </div>

                {/* Avatar Grid */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {AVATARS.map((avatar) => (
                        <button
                            key={avatar.id}
                            onClick={() => setSelected(avatar.id)}
                            className={`w-full aspect-square rounded-xl flex items-center justify-center text-3xl transition-all ${selected === avatar.id
                                    ? 'bg-primary/20 border-2 border-primary scale-110'
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            {avatar.emoji}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-100 text-text-muted font-bold rounded-xl"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-3 bg-primary text-white font-bold rounded-xl"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

export function getAvatarEmoji(avatarId) {
    return AVATARS.find(a => a.id === avatarId)?.emoji || null;
}

export { AVATARS };
export default AvatarPicker;
