'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVideos, useClasses, useSubjects, createRecord, updateRecord, deleteRecord } from '@/hooks/useSupabaseData';

export default function TeacherVideosPage() {
    const { user } = useAuth();
    const { data: allVideos, loading: videosLoading, refetch: refetchVideos } = useVideos();
    const { data: allClasses, loading: classesLoading } = useClasses({ teacher_id: user?.id });
    const { data: subjects, loading: subjectsLoading } = useSubjects();

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        url: '',
        subject_id: '',
        class_id: '',
        duration: '',
    });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    const isLoading = videosLoading || classesLoading || subjectsLoading;

    // Filter videos created by this teacher
    const videos = useMemo(() => {
        return allVideos.filter(v => v.teacher_id === user?.id);
    }, [allVideos, user]);

    const classes = allClasses;

    const handleSubmit = async () => {
        if (!formData.title || !formData.url) {
            alert('Please fill in title and video URL');
            return;
        }

        setSaving(true);
        try {
            const videoData = {
                ...formData,
                teacher_id: user?.id,
                type: getVideoType(formData.url),
            };

            if (editingId) {
                await updateRecord('videos', editingId, videoData);
            } else {
                await createRecord('videos', videoData);
            }

            resetForm();
            refetchVideos();
        } catch (error) {
            alert('Error saving: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const getVideoType = (url) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vimeo.com')) return 'vimeo';
        return 'direct';
    };

    const getYouTubeId = (url) => {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        return match ? match[1] : null;
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            url: '',
            subject_id: '',
            class_id: '',
            duration: '',
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (video) => {
        setFormData({
            title: video.title,
            description: video.description || '',
            url: video.url,
            subject_id: video.subject_id || '',
            class_id: video.class_id || '',
            duration: video.duration || '',
        });
        setEditingId(video.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this video?')) {
            try {
                await deleteRecord('videos', id);
                refetchVideos();
            } catch (error) {
                alert('Error deleting: ' + error.message);
            }
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-text-main">📹 Video Library</h2>
                    <p className="text-sm text-text-muted">Manage learning videos for your students</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-2xl font-bold text-primary">{videos.length}</p>
                    <p className="text-xs text-text-muted">Videos</p>
                </div>
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-2xl font-bold text-blue-500">{classes.length}</p>
                    <p className="text-xs text-text-muted">Classes</p>
                </div>
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-2xl font-bold text-green-500">
                        {videos.filter(v => v.classIds?.length > 0).length}
                    </p>
                    <p className="text-xs text-text-muted">Assigned</p>
                </div>
            </div>

            {/* Video Form */}
            {showForm && (
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-text-main">
                            {editingId ? '✏️ Edit Video' : '➕ Add Video'}
                        </h3>
                        <button onClick={resetForm} className="text-text-muted">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Learning Numbers 1-10"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Video URL</label>
                        <input
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            placeholder="https://youtube.com/watch?v=... or direct video URL"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                        />
                        <p className="text-xs text-text-muted mt-1">Supports YouTube, Vimeo, or direct MP4 links</p>
                    </div>

                    {/* YouTube Preview */}
                    {formData.url && getVideoType(formData.url) === 'youtube' && getYouTubeId(formData.url) && (
                        <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                            <iframe
                                src={`https://www.youtube.com/embed/${getYouTubeId(formData.url)}`}
                                className="w-full h-full"
                                allowFullScreen
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What will students learn from this video?"
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Subject</label>
                            <select
                                value={formData.subject_id}
                                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                            >
                                <option value="">Select subject</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Duration</label>
                            <input
                                type="text"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                placeholder="e.g. 5:30"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">Assign to Class</label>
                        <select
                            value={formData.class_id}
                            onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                        >
                            <option value="">Select a class</option>
                            {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : (editingId ? 'Update Video' : 'Add Video')}
                    </button>
                </div>
            )}

            {/* Video List */}
            <div className="space-y-3">
                {videos.length === 0 ? (
                    <div className="bg-card-light rounded-xl p-8 border border-gray-100 text-center">
                        <span className="text-5xl mb-4 block">📹</span>
                        <p className="text-text-muted mb-4">No videos yet. Add your first learning video!</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-6 py-2 bg-primary text-white font-bold rounded-xl"
                        >
                            Add Video
                        </button>
                    </div>
                ) : (
                    videos.map((video) => {
                        const subject = subjects.find(s => s.id === video.subject_id);
                        const assignedClass = classes.find(c => c.id === video.class_id);
                        const ytId = getYouTubeId(video.url);

                        return (
                            <div key={video.id} className="bg-card-light rounded-xl border border-gray-100 overflow-hidden">
                                <div className="flex">
                                    {/* Thumbnail */}
                                    <div className="w-32 h-24 bg-gray-200 shrink-0">
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
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 p-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-bold text-text-main">{video.title}</h4>
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
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEdit(video)}
                                                    className="p-1 hover:bg-gray-100 rounded"
                                                >
                                                    <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 18 }}>edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(video.id)}
                                                    className="p-1 hover:bg-red-50 rounded"
                                                >
                                                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        {assignedClass && (
                                            <div className="flex gap-1 mt-2">
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-text-muted">
                                                    {assignedClass.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FAB */}
            {!showForm && videos.length > 0 && (
                <button
                    onClick={() => setShowForm(true)}
                    className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
                </button>
            )}
        </div>
    );
}
