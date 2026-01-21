'use client';

import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useEnrollments, useAssignments, useSubmissions, createRecord } from '@/hooks/useSupabaseData';
import { processImage } from '@/lib/fileUtils';

export default function StudentAssignmentsPage() {
    const { user } = useAuth();
    const { awardXP } = useGame();
    const { data: enrollments, loading: enrollmentsLoading } = useEnrollments({ student_id: user?.id });
    const { data: allAssignments, loading: assignmentsLoading } = useAssignments();
    const { data: allSubmissions, loading: submissionsLoading, refetch: refetchSubmissions } = useSubmissions({ student_id: user?.id });

    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [note, setNote] = useState('');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    const isLoading = enrollmentsLoading || assignmentsLoading || submissionsLoading;

    // Get student's class IDs and filter assignments
    const assignments = useMemo(() => {
        const classIds = enrollments.map(e => e.class_id);
        const myAssignments = allAssignments.filter(a => classIds.includes(a.class_id));

        return myAssignments.map(a => {
            const submission = allSubmissions.find(s => s.assignment_id === a.id);
            return {
                ...a,
                submission,
                isSubmitted: !!submission,
                isGraded: submission?.grade !== undefined && submission?.grade !== null,
            };
        });
    }, [enrollments, allAssignments, allSubmissions]);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const result = await processImage(file);
                if (result.success) {
                    setUploadedFiles(prev => [...prev, {
                        name: file.name,
                        type: file.type,
                        data: result.data,
                    }]);
                }
            } else if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = () => {
                    setUploadedFiles(prev => [...prev, {
                        name: file.name,
                        type: file.type,
                        data: reader.result,
                    }]);
                };
                reader.readAsDataURL(file);
            }
        }

        setUploading(false);
    };

    const handleSubmit = async () => {
        if (uploadedFiles.length === 0) {
            alert('Please upload at least one file');
            return;
        }

        setSubmitting(true);
        try {
            await createRecord('submissions', {
                assignment_id: selectedAssignment.id,
                student_id: user.id,
                file_name: uploadedFiles[0]?.name,
                file_type: uploadedFiles[0]?.type,
                file_data: uploadedFiles[0]?.data,
                note,
                submitted_at: new Date().toISOString(),
            });

            // Award XP for submitting
            await awardXP(10);

            setSelectedAssignment(null);
            setUploadedFiles([]);
            setNote('');
            refetchSubmissions();
        } catch (error) {
            alert('Error submitting: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const removeFile = (index) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading assignments...</p>
                </div>
            </div>
        );
    }

    // Assignment submission view
    if (selectedAssignment) {
        const isOverdue = selectedAssignment.due_date && new Date(selectedAssignment.due_date) < new Date();

        if (selectedAssignment.isSubmitted) {
            const sub = selectedAssignment.submission;
            return (
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedAssignment(null)}>
                            <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                        </button>
                        <h2 className="text-lg font-bold text-text-main">Your Submission</h2>
                    </div>

                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-text-main mb-2">{selectedAssignment.title}</h3>
                        <p className="text-sm text-text-muted">
                            Submitted: {new Date(sub.submitted_at).toLocaleString()}
                        </p>
                    </div>

                    {/* Grade Display */}
                    <div className={`rounded-xl p-6 text-center ${sub.grade !== undefined && sub.grade !== null ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        {sub.grade !== undefined && sub.grade !== null ? (
                            <>
                                <p className="text-4xl font-bold text-green-600">{sub.grade}</p>
                                <p className="text-green-700">/{selectedAssignment.max_score || 100}</p>
                                {sub.feedback && (
                                    <div className="mt-4 p-3 bg-white rounded-lg text-left">
                                        <p className="text-sm font-medium text-text-main">Teacher's feedback:</p>
                                        <p className="text-sm text-text-muted">{sub.feedback}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <span className="text-4xl">⏳</span>
                                <p className="text-yellow-700 font-medium mt-2">Waiting for grade</p>
                            </>
                        )}
                    </div>

                    {/* Submitted Files */}
                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <h4 className="font-bold text-text-main mb-3">📎 Your Files</h4>
                        {sub.file_name && (
                            <div className="mb-2">
                                {sub.file_type?.startsWith('image') ? (
                                    <img src={sub.file_data} alt={sub.file_name} className="max-w-full rounded-lg" />
                                ) : (
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                        <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                                        <span className="text-sm">{sub.file_name}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Upload form
        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedAssignment(null)}>
                        <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold text-text-main">Submit Assignment</h2>
                </div>

                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h3 className="font-bold text-text-main mb-2">{selectedAssignment.title}</h3>
                    {selectedAssignment.description && (
                        <p className="text-sm text-text-muted mb-2">{selectedAssignment.description}</p>
                    )}
                    {selectedAssignment.due_date && (
                        <p className={`text-sm ${isOverdue ? 'text-red-500' : 'text-text-muted'}`}>
                            Due: {new Date(selectedAssignment.due_date).toLocaleString()}
                            {isOverdue && ' (Overdue!)'}
                        </p>
                    )}
                </div>

                {/* File Upload */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                    <span className="material-symbols-outlined text-text-muted mb-2" style={{ fontSize: 48 }}>
                        {uploading ? 'hourglass_empty' : 'upload_file'}
                    </span>
                    <p className="text-text-main font-medium">
                        {uploading ? 'Uploading...' : 'Tap to upload files'}
                    </p>
                    <p className="text-sm text-text-muted">Images or PDF</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                    <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-3">
                        <h4 className="font-bold text-text-main">📎 Uploaded Files</h4>
                        {uploadedFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-3">
                                {file.type?.startsWith('image') ? (
                                    <img src={file.data} alt={file.name} className="w-16 h-16 object-cover rounded" />
                                ) : (
                                    <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                                        <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                                    </div>
                                )}
                                <span className="flex-1 text-sm truncate">{file.name}</span>
                                <button
                                    onClick={() => removeFile(i)}
                                    className="p-1 hover:bg-red-50 rounded"
                                >
                                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Note */}
                <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Note (Optional)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note for your teacher..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 resize-none"
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={uploadedFiles.length === 0 || submitting}
                    className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                >
                    {submitting ? 'Submitting...' : 'Submit Assignment (+10 XP)'}
                </button>
            </div>
        );
    }

    // Assignments list
    return (
        <div className="p-4 space-y-4">
            <div>
                <h2 className="text-xl font-bold text-text-main">📋 My Assignments</h2>
                <p className="text-sm text-text-muted">Complete and submit your work</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-100 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-blue-600">{assignments.length}</p>
                    <p className="text-xs text-blue-700">Total</p>
                </div>
                <div className="bg-orange-100 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-orange-600">
                        {assignments.filter(a => !a.isSubmitted).length}
                    </p>
                    <p className="text-xs text-orange-700">Pending</p>
                </div>
                <div className="bg-green-100 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-green-600">
                        {assignments.filter(a => a.isGraded).length}
                    </p>
                    <p className="text-xs text-green-700">Graded</p>
                </div>
            </div>

            {/* Assignments List */}
            {assignments.length > 0 ? (
                <div className="space-y-3">
                    {assignments.map((assignment) => {
                        const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();

                        return (
                            <button
                                key={assignment.id}
                                onClick={() => setSelectedAssignment(assignment)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card-light border border-gray-100 text-left hover:border-primary"
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${assignment.isGraded ? 'bg-green-100' :
                                    assignment.isSubmitted ? 'bg-yellow-100' :
                                        'bg-purple-100'
                                    }`}>
                                    {assignment.isGraded ? '✅' : assignment.isSubmitted ? '⏳' : '📋'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-text-main">{assignment.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {assignment.isGraded ? (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                Score: {assignment.submission?.grade}/{assignment.max_score || 100}
                                            </span>
                                        ) : assignment.isSubmitted ? (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                                Submitted
                                            </span>
                                        ) : isOverdue ? (
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                Overdue
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                Not submitted
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-text-muted">chevron_right</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-card-light rounded-xl border border-gray-100">
                    <span className="text-5xl mb-4 block">📋</span>
                    <p className="text-text-muted">No assignments yet</p>
                    <p className="text-sm text-text-muted">Check back later!</p>
                </div>
            )}
        </div>
    );
}
