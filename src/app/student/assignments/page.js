'use client';

import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useEnrollments, useAssignments, useSubmissions, useAssessments, useAttempts, useSubjects, createRecord } from '@/hooks/useSupabaseData';
import { checkAccessibility } from '@/lib/examMode';
import { processImage } from '@/lib/fileUtils';
import { useRouter } from 'next/navigation';

export default function StudentAssignmentsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { awardXP } = useGame();
    const { data: enrollments, loading: enrollmentsLoading } = useEnrollments({ student_id: user?.id });
    const { data: allAssignments, loading: assignmentsLoading } = useAssignments();
    const { data: allSubmissions, loading: submissionsLoading, refetch: refetchSubmissions } = useSubmissions({ student_id: user?.id });
    const { data: allAssessments, loading: assessmentsLoading } = useAssessments();
    const { data: allAttempts, loading: attemptsLoading } = useAttempts({ user_id: user?.id });
    const { data: subjects, loading: subjectsLoading } = useSubjects();

    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [note, setNote] = useState('');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    const isLoading = enrollmentsLoading || assignmentsLoading || submissionsLoading || assessmentsLoading || attemptsLoading || subjectsLoading;

    // Combine and process all tasks (assignments + quizzes)
    const { pendingTasks, completedTasks, stats } = useMemo(() => {
        const classIds = enrollments.map(e => e.class_id);

        // Process Assignments
        const myAssignments = allAssignments.filter(a => classIds.includes(a.class_id)).map(a => {
            const submission = allSubmissions.find(s => s.assignment_id === a.id);
            const subject = subjects.find(s => {
                // Try to guess subject from title or use a default if not linked
                // In a real app, assignments should probably have subject_id. 
                // Currently they don't in the schema, but could be inferred or default.
                // Assuming 'General' or trying to find match.
                return true;
            });

            return {
                ...a,
                taskType: 'assignment',
                status: submission ? (submission.grade ? 'graded' : 'submitted') :
                    (a.due_date && new Date(a.due_date) < new Date()) ? 'overdue' : 'pending',
                submission,
                subject_id: 'general' // Assignments table doesn't have subject_id yet, grouping under General or Class
            };
        });

        // Process Quizzes
        const myQuizzes = allAssessments.filter(a => {
            if (a.type === 'game') return false;
            return (a.class_id && classIds.includes(a.class_id)) || !a.class_id;
        }).map(a => {
            const attempts = allAttempts.filter(at => at.assessment_id === a.id);
            const isCompleted = attempts.length > 0; // Simplified
            const access = checkAccessibility(a);

            return {
                ...a,
                taskType: 'quiz', // or a.type (multiple_choice, essay, etc)
                status: isCompleted ? 'completed' :
                    (!access.accessible) ? 'locked' :
                        (a.due_date && new Date(a.due_date) < new Date()) ? 'expired' : 'pending',
                attempts,
                access
            };
        });

        const all = [...myAssignments, ...myQuizzes];

        // Split
        const pending = all.filter(t => ['pending', 'overdue', 'expired', 'locked'].includes(t.status));
        const completed = all.filter(t => ['submitted', 'graded', 'completed'].includes(t.status));

        // Grouping helper
        const group = (list) => {
            const groups = {};
            list.forEach(item => {
                let subjectName = 'General Tasks';
                if (item.subject_id && item.subject_id !== 'general') {
                    const sub = subjects.find(s => s.id === item.subject_id);
                    if (sub) subjectName = sub.name;
                } else if (item.subject) {
                    subjectName = item.subject; // Fallback for old schema
                }

                if (!groups[subjectName]) groups[subjectName] = [];
                groups[subjectName].push(item);
            });
            return groups;
        };

        return {
            pendingTasks: group(pending),
            completedTasks: group(completed),
            stats: {
                total: all.length,
                pending: pending.length,
                completed: completed.length
            }
        };

    }, [enrollments, allAssignments, allSubmissions, allAssessments, allAttempts, subjects]);

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

    // Unified Tasks List View
    return (
        <div className="p-4 space-y-6 pb-24">
            <div>
                <h2 className="text-2xl font-bold text-text-main">📌 My Tasks Dashboard</h2>
                <p className="text-text-muted">Stay on top of your learning!</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-100 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Total Tasks</p>
                </div>
                <div className="bg-orange-100 rounded-2xl p-4 text-center shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-orange-200 rounded-bl-full opacity-50"></div>
                    <p className="text-2xl font-bold text-orange-700">{stats.pending}</p>
                    <p className="text-xs text-orange-600 font-bold uppercase tracking-wide">To Do</p>
                </div>
                <div className="bg-green-100 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
                    <p className="text-xs text-green-600 font-bold uppercase tracking-wide">Done</p>
                </div>
            </div>

            {/* Tasks Grouped by Subject */}
            <div className="space-y-6">
                {Object.keys(pendingTasks).length > 0 ? (
                    Object.entries(pendingTasks).map(([subject, tasks]) => (
                        <div key={subject} className="space-y-3">
                            <h3 className="font-bold text-lg text-text-main flex items-center gap-2">
                                <span className="w-1 h-6 bg-primary rounded-full"></span>
                                {subject}
                            </h3>
                            <div className="grid gap-3">
                                {tasks.map(task => (
                                    <button
                                        key={task.id}
                                        onClick={() => {
                                            if (task.taskType === 'assignment') {
                                                setSelectedAssignment(task);
                                            } else {
                                                // Link to quiz
                                                router.push(`/student/practice?id=${task.id}&subject=${task.subject_id}`);
                                            }
                                        }}
                                        className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary transition-all text-left flex items-start gap-4 group"
                                    >
                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${task.taskType === 'assignment' ? 'bg-purple-100' :
                                            task.type === 'drawing' ? 'bg-pink-100' :
                                                task.type === 'essay' ? 'bg-blue-100' : 'bg-orange-100'
                                            }`}>
                                            {task.taskType === 'assignment' ? '📋' :
                                                task.type === 'drawing' ? '🎨' :
                                                    task.type === 'essay' ? '✏️' : '📝'}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-text-main truncate group-hover:text-primary transition-colors">
                                                    {task.title}
                                                </h4>
                                                {task.status === 'overdue' && (
                                                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">OVERDUE</span>
                                                )}
                                                {task.status === 'pending' && task.due_date && (
                                                    <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-bold">
                                                        Due {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-text-muted mt-0.5 line-clamp-1">
                                                {task.description || (task.taskType === 'assignment' ? 'Assignment' : 'Quiz')}
                                            </p>

                                            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                                                <span className="capitalize">{task.type || 'Combined'}</span>
                                                {task.questions && <span>• {task.questions.length} Questions</span>}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <span className="text-4xl mb-3 block">🎉</span>
                        <p className="text-text-main font-bold">All caught up!</p>
                        <p className="text-sm text-text-muted">No pending tasks found.</p>
                    </div>
                )}
            </div>

            {/* Completed History Accordion (Simplified as just list for now) */}
            {Object.keys(completedTasks).length > 0 && (
                <div className="pt-8 border-t border-gray-100">
                    <h3 className="font-bold text-lg text-text-muted mb-4">History</h3>
                    <div className="space-y-2">
                        {Object.values(completedTasks).flat().map(task => {
                            // Get grade info based on task type
                            const isQuiz = task.taskType === 'quiz';
                            const latestAttempt = isQuiz ? task.attempts?.[0] : null;
                            const grade = isQuiz
                                ? (latestAttempt?.teacher_score ?? latestAttempt?.score)
                                : task.submission?.grade;
                            const feedback = isQuiz
                                ? latestAttempt?.teacher_feedback
                                : task.submission?.feedback;
                            const isGraded = grade !== undefined && grade !== null;
                            const isPendingGrade = isQuiz && ['essay', 'written_exam', 'drawing'].includes(task.type) && !isGraded;

                            return (
                                <div key={task.id} className={`p-4 rounded-xl flex items-center gap-3 border ${isGraded ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${isGraded ? 'bg-green-200 text-green-700' :
                                            isPendingGrade ? 'bg-yellow-200 text-yellow-700' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                        {isGraded ? grade : isPendingGrade ? '⏳' : '✓'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-text-main text-sm">{task.title}</p>
                                        <p className="text-xs text-text-muted">
                                            {isGraded ? `Score: ${grade}/100` : isPendingGrade ? 'Awaiting grade' : 'Completed'}
                                            {task.taskType === 'quiz' && ` • ${task.type || 'Quiz'}`}
                                        </p>
                                        {feedback && (
                                            <p className="text-xs text-green-600 mt-1">💬 {feedback}</p>
                                        )}
                                    </div>
                                    {isGraded && (
                                        <div className="text-green-500">
                                            <span className="material-symbols-outlined">check_circle</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
