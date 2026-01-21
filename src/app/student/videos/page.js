'use client';

import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useVideos, useEnrollments, useSubjects, createRecord, updateRecord } from '@/hooks/useSupabaseData';

export default function StudentVideosPage() {
    const { user } = useAuth();
    const { awardXP } = useGame();
    const { data: allVideos, loading: videosLoading } = useVideos();
    const { data: allEnrollments, loading: enrollmentsLoading } = useEnrollments({ student_id: user?.id });
    const { data: subjects, loading: subjectsLoading } = useSubjects();

    const [selectedVideo, setSelectedVideo] = useState(null);
    const [watchProgress, setWatchProgress] = useState({});
    const videoRef = useRef(null);

    const isLoading = videosLoading || enrollmentsLoading || subjectsLoading;

    // Filter videos for enrolled classes
    const videos = useMemo(() => {
        const classIds = allEnrollments.map(e => e.class_id);
        return allVideos.filter(v =>
            (v.class_id && classIds.includes(v.class_id)) || !v.class_id
        );
    }, [allEnrollments, allVideos]);

    const getYouTubeId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        return match ? match[1] : null;
    };

    const handleVideoSelect = (video) => {
        setSelectedVideo(video);
    };

    const handleVideoComplete = async (videoId) => {
        if (!user?.id || watchProgress[videoId]?.completed) return;

        // Award XP
        awardXP(15, selectedVideo?.subject_id);

        // Update local state
        setWatchProgress(prev => ({
            ...prev,
            [videoId]: { ...prev[videoId], completed: true },
        }));
    };

    const getSubject = (subjectId) => subjects.find(s => s.id === subjectId);

    if (selectedVideo) {
        const ytId = getYouTubeId(selectedVideo.url);
        const subject = getSubject(selectedVideo.subject_id);
        const isCompleted = watchProgress[selectedVideo.id]?.completed;

        return (
            <div className="min-h-screen bg-background-light">
                {/* Header */}
                <header className="sticky top-0 bg-card-light border-b border-gray-100 p-4 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedVideo(null)}>
                            <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                        </button>
                        <div className="flex-1">
                            <h2 className="font-bold text-text-main truncate">{selectedVideo.title}</h2>
                            {subject && (
                                <span className="text-xs text-text-muted">{subject.emoji} {subject.name}</span>
                            )}
                        </div>
                        {isCompleted && (
                            <span className="text-green-500 text-sm font-bold">✅ Completed</span>
                        )}
                    </div>
                </header>

                {/* Video Player */}
                <div className="aspect-video bg-black">
                    {ytId ? (
                        <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            src={selectedVideo.url}
                            controls
                            autoPlay
                            className="w-full h-full"
                            onEnded={() => handleVideoComplete(selectedVideo.id)}
                        />
                    )}
                </div>

                {/* Video Info */}
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        {selectedVideo.duration && (
                            <span className="text-sm text-text-muted">⏱ {selectedVideo.duration}</span>
                        )}
                        <span className="text-sm text-text-muted">•</span>
                        <span className="text-sm text-yellow-600 font-bold">🌟 15 XP</span>
                    </div>

                    {selectedVideo.description && (
                        <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                            <h4 className="font-bold text-text-main mb-2">📝 About this video</h4>
                            <p className="text-text-muted text-sm">{selectedVideo.description}</p>
                        </div>
                    )}

                    {!isCompleted && (
                        <button
                            onClick={() => handleVideoComplete(selectedVideo.id)}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">check_circle</span>
                            Mark as Complete (+15 XP)
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-text-main">📹 Learning Videos</h2>
                <p className="text-sm text-text-muted">Watch fun videos and earn XP!</p>
            </div>

            {/* Progress Stats */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/80 text-sm">Videos Completed</p>
                        <p className="text-3xl font-bold">
                            {Object.values(watchProgress).filter(p => p.completed).length}/{videos.length}
                        </p>
                    </div>
                    <div className="text-5xl">🎬</div>
                </div>
            </div>

            {/* Video List */}
            {videos.length === 0 ? (
                <div className="bg-card-light rounded-xl p-8 border border-gray-100 text-center">
                    <span className="text-5xl mb-4 block">📹</span>
                    <p className="text-text-muted">No videos available yet.</p>
                    <p className="text-sm text-text-muted">Check back later for new learning videos!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {videos.map((video) => {
                        const ytId = getYouTubeId(video.url);
                        const subject = getSubject(video.subject_id);
                        const isCompleted = watchProgress[video.id]?.completed;

                        return (
                            <button
                                key={video.id}
                                onClick={() => handleVideoSelect(video)}
                                className="w-full bg-card-light rounded-xl border border-gray-100 overflow-hidden text-left"
                            >
                                <div className="flex">
                                    {/* Thumbnail */}
                                    <div className="w-32 h-24 bg-gray-200 shrink-0 relative">
                                        {ytId ? (
                                            <img
                                                src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                                alt={video.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">
                                                🎬
                                            </div>
                                        )}
                                        {/* Play button overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>
                                                    play_arrow
                                                </span>
                                            </div>
                                        </div>
                                        {/* Completed badge */}
                                        {isCompleted && (
                                            <div className="absolute top-1 right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>check</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 p-3">
                                        <h4 className="font-bold text-text-main line-clamp-2">{video.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {subject && (
                                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                    {subject.emoji} {subject.name}
                                                </span>
                                            )}
                                            {video.duration && (
                                                <span className="text-xs text-text-muted">⏱ {video.duration}</span>
                                            )}
                                        </div>
                                        <div className="mt-1">
                                            <span className="text-xs text-yellow-600 font-bold">🌟 15 XP</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
