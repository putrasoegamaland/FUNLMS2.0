'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestions, useSubjects, useTopics, createQuestion, updateQuestion, updateQuestionStatus, saveAIReview } from '@/hooks/useSupabaseData';
import { analyzeQuestion, isQCConfigured, getAvailableSubjects } from '@/lib/hotsQC';
import { checkRoutingRules, checkAutoApproveRules, getStatusLabel, getStatusBadgeColor } from '@/lib/routingRules';
import AIReviewPanel from '@/components/AIReviewPanel';
import DocumentUploader from '@/components/DocumentUploader';

export default function TeacherQuestionsPage() {
    const { user } = useAuth();
    const { data: questions, loading: questionsLoading, refetch: refetchQuestions } = useQuestions({ authorId: user?.id });
    const { data: subjects, loading: subjectsLoading } = useSubjects();

    const [step, setStep] = useState('list'); // list, create, edit, review
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [aiReviewResult, setAIReviewResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showDocumentUploader, setShowDocumentUploader] = useState(false);
    const [importedQuestions, setImportedQuestions] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        type: 'mcq',
        prompt: '',
        options: [
            { id: '1', text: '', isCorrect: true },
            { id: '2', text: '', isCorrect: false },
            { id: '3', text: '', isCorrect: false },
            { id: '4', text: '', isCorrect: false }
        ],
        expected_answer: '',
        rubric: null,
        subject_id: '',
        topic_id: '',
        grade_band: 'SMP',
        grade: 7,
        teacher_difficulty: 'medium',
        teacher_hots_claim: false,
        attachments: []
    });

    // Get topics for selected subject
    const { data: topics } = useTopics(formData.subject_id);

    const resetForm = () => {
        setFormData({
            type: 'mcq',
            prompt: '',
            options: [
                { id: '1', text: '', isCorrect: true },
                { id: '2', text: '', isCorrect: false },
                { id: '3', text: '', isCorrect: false },
                { id: '4', text: '', isCorrect: false }
            ],
            expected_answer: '',
            rubric: null,
            subject_id: '',
            topic_id: '',
            grade_band: 'SMP',
            grade: 7,
            teacher_difficulty: 'medium',
            teacher_hots_claim: false,
            attachments: []
        });
        setAIReviewResult(null);
    };

    // Handle creating a new question
    const handleCreateQuestion = async () => {
        setIsSubmitting(true);
        try {
            const question = await createQuestion({
                ...formData,
                author_id: user?.id
            });
            resetForm();
            refetchQuestions();
            setStep('list');
            alert('Question saved as draft!');
        } catch (error) {
            console.error('Error creating question:', error);
            alert('Error creating question: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle updating a question
    const handleUpdateQuestion = async () => {
        if (!selectedQuestion) return;
        setIsSubmitting(true);
        try {
            await updateQuestion(selectedQuestion.id, formData);
            refetchQuestions();
            setStep('list');
            alert('Question updated!');
        } catch (error) {
            console.error('Error updating question:', error);
            alert('Error updating question: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit for AI review
    const handleSubmitForReview = async () => {
        if (!selectedQuestion) return;

        setIsAnalyzing(true);
        try {
            // Update status to submitted
            await updateQuestionStatus(selectedQuestion.id, 'submitted_for_review');

            // Run AI analysis
            const subjectKey = getSubjectKey(formData.subject_id);
            const result = await analyzeQuestion(formData, subjectKey, formData.grade_band);

            if (result.success) {
                // Save AI review
                await saveAIReview(selectedQuestion.id, result.data);
                setAIReviewResult(result.data);

                // Check routing rules
                const routing = checkRoutingRules(formData, result.data);
                const autoApprove = checkAutoApproveRules(formData, result.data);

                if (autoApprove.canAutoApprove) {
                    // Auto-approve
                    await updateQuestionStatus(selectedQuestion.id, 'approved');
                    alert('✅ Question auto-approved! No issues detected.');
                } else if (routing.requiresAdmin) {
                    // Send to admin queue
                    await updateQuestionStatus(selectedQuestion.id, 'admin_review_required');
                    alert('⚠️ Question sent to admin review queue.\nReasons:\n' + routing.reasons.join('\n'));
                } else {
                    await updateQuestionStatus(selectedQuestion.id, 'ai_reviewed');
                    alert('Question reviewed by AI. Check the analysis below.');
                }

                setStep('review');
            } else {
                // AI failed, mark as needs admin review
                await updateQuestionStatus(selectedQuestion.id, 'admin_review_required');
                alert('AI analysis failed. Question sent to admin for manual review.');
            }

            refetchQuestions();
        } catch (error) {
            console.error('Error submitting for review:', error);
            alert('Error: ' + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Helper to get subject key from ID
    const getSubjectKey = (subjectId) => {
        const subject = subjects?.find(s => s.id === subjectId);
        if (!subject) return 'science';
        const name = subject.name.toLowerCase();
        if (name.includes('math')) return 'math';
        if (name.includes('english') || name.includes('inggris')) return 'english';
        if (name.includes('civics') || name.includes('ppkn') || name.includes('kewarganegaraan')) return 'civics';
        if (name.includes('economy') || name.includes('ekonomi')) return 'economy';
        return 'science';
    };

    // Handle editing a question
    const handleEditQuestion = (question) => {
        setSelectedQuestion(question);
        setFormData({
            type: question.type || 'mcq',
            prompt: question.prompt || '',
            options: question.options || [
                { id: '1', text: '', isCorrect: true },
                { id: '2', text: '', isCorrect: false },
                { id: '3', text: '', isCorrect: false },
                { id: '4', text: '', isCorrect: false }
            ],
            expected_answer: question.expected_answer || '',
            rubric: question.rubric,
            subject_id: question.subject_id || '',
            topic_id: question.topic_id || '',
            grade_band: question.grade_band || 'SMP',
            grade: question.grade || 7,
            teacher_difficulty: question.teacher_difficulty || 'medium',
            teacher_hots_claim: question.teacher_hots_claim || false,
            attachments: question.attachments || []
        });
        setStep('edit');
    };

    // Add/remove MCQ options
    const addOption = () => {
        const newId = String(formData.options.length + 1);
        setFormData({
            ...formData,
            options: [...formData.options, { id: newId, text: '', isCorrect: false }]
        });
    };

    const removeOption = (id) => {
        if (formData.options.length <= 2) return;
        setFormData({
            ...formData,
            options: formData.options.filter(o => o.id !== id)
        });
    };

    const updateOption = (id, field, value) => {
        setFormData({
            ...formData,
            options: formData.options.map(o => {
                if (o.id === id) {
                    if (field === 'isCorrect' && value) {
                        // Only one correct answer for MCQ
                        return { ...o, isCorrect: true };
                    }
                    return { ...o, [field]: value };
                }
                // If setting another option as correct, unset this one
                if (field === 'isCorrect' && value) {
                    return { ...o, isCorrect: false };
                }
                return o;
            })
        });
    };

    // Handle questions imported from document - show for review first
    const handleDocumentImport = (questions) => {
        // Store in state for review, add AI analysis results placeholder
        const questionsWithAnalysis = questions.map(q => ({
            ...q,
            id: q.id || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }))),
            type: q.type === 'mc' ? 'mcq' : q.type,
            aiAnalysis: null,
            selected: true
        }));
        setImportedQuestions(questionsWithAnalysis);
        setShowDocumentUploader(false);
        setStep('import_review');
    };

    // Analyze imported question with AI
    const analyzeImportedQuestion = async (index) => {
        const q = importedQuestions[index];
        if (q.aiAnalysis) return; // Already analyzed

        try {
            const result = await analyzeQuestion(
                { prompt: q.prompt, options: q.options, type: q.type },
                'science',
                formData.grade_band
            );

            setImportedQuestions(prev => prev.map((item, i) =>
                i === index ? { ...item, aiAnalysis: result.success ? result.data : { error: result.error } } : item
            ));
        } catch (err) {
            console.error('Analysis error:', err);
        }
    };

    // Save approved imported questions to database
    const saveImportedQuestions = async () => {
        const selectedQuestions = importedQuestions.filter(q => q.selected);
        if (selectedQuestions.length === 0) {
            alert('Pilih minimal 1 soal untuk disimpan');
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;

        for (const q of selectedQuestions) {
            try {
                await createQuestion({
                    type: q.type,
                    prompt: q.prompt,
                    options: q.options,
                    author_id: user?.id,
                    subject_id: formData.subject_id || null,
                    grade_band: formData.grade_band,
                    teacher_difficulty: q.aiAnalysis?.difficulty?.level || q.difficulty || 'medium',
                    teacher_hots_claim: q.aiAnalysis?.is_hots || false,
                    status: 'draft'
                });
                successCount++;
            } catch (err) {
                console.error('Error saving:', err);
            }
        }

        setIsSubmitting(false);
        setImportedQuestions([]);
        await refetchQuestions();
        setStep('list');
        alert(`✅ ${successCount} soal berhasil disimpan ke Question Bank!`);
    };

    const isLoading = questionsLoading || subjectsLoading;

    // Question List View
    if (step === 'list') {
        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text-main">📝 Question Bank (HOTS QC)</h2>
                    <button
                        onClick={() => { resetForm(); setSelectedQuestion(null); setStep('create'); }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
                        New Question
                    </button>
                </div>

                {!isQCConfigured() && (
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                        <p className="text-yellow-700 font-medium">⚠️ AI QC not configured</p>
                        <p className="text-sm text-yellow-600">Add NEXT_PUBLIC_GEMINI_API_KEY to enable automatic question analysis.</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="py-12 text-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : questions?.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        <span className="text-5xl">📋</span>
                        <p className="mt-3 font-medium">No questions yet</p>
                        <p className="text-sm">Create your first question to get started</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {questions?.map((question) => (
                            <div
                                key={question.id}
                                className="bg-card-light rounded-xl p-4 border border-gray-100"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${getStatusBadgeColor(question.status)}-100 text-${getStatusBadgeColor(question.status)}-600`}>
                                                {getStatusLabel(question.status)}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                {question.type?.toUpperCase()}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                                                {question.teacher_difficulty}
                                            </span>
                                            {question.teacher_hots_claim && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                                                    HOTS
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-text-main line-clamp-2">{question.prompt}</p>
                                        <p className="text-xs text-text-muted mt-1">
                                            {question.grade_band} • Grade {question.grade} •
                                            {new Date(question.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        {question.status === 'draft' && (
                                            <button
                                                onClick={() => handleEditQuestion(question)}
                                                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                                            </button>
                                        )}
                                        {question.status === 'returned_to_teacher' && (
                                            <button
                                                onClick={() => handleEditQuestion(question)}
                                                className="p-2 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600"
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setSelectedQuestion(question); setStep('review'); }}
                                            className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                                        </button>
                                    </div>
                                </div>
                                {question.return_reason && (
                                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                        <p className="text-sm text-red-600 font-medium">Return Reason:</p>
                                        <p className="text-sm text-red-700">{question.return_reason}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Create/Edit Form View
    if (step === 'create' || step === 'edit') {
        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => setStep('list')} className="flex items-center gap-2 text-text-muted">
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back
                    </button>
                    <h2 className="text-lg font-bold text-text-main">
                        {step === 'create' ? '✨ Create Question' : '✏️ Edit Question'}
                    </h2>
                    <button
                        onClick={() => setShowDocumentUploader(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors text-sm"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload_file</span>
                        Import dari Word/PDF
                    </button>
                </div>

                {/* Question Type */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h3 className="font-bold text-text-main mb-3">Question Type</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'mcq', label: 'Multiple Choice', icon: '🔘' },
                            { value: 'short', label: 'Short Answer', icon: '📝' },
                            { value: 'cer', label: 'CER Response', icon: '💡' },
                            { value: 'case', label: 'Case Study', icon: '📋' },
                            { value: 'data', label: 'Data Analysis', icon: '📊' },
                            { value: 'error_analysis', label: 'Error Debug', icon: '🔍' }
                        ].map(type => (
                            <button
                                key={type.value}
                                onClick={() => setFormData({ ...formData, type: type.value })}
                                className={`p-3 rounded-xl border text-center transition-colors ${formData.type === type.value
                                    ? 'bg-primary/10 border-primary'
                                    : 'bg-white border-gray-200 hover:border-primary/50'
                                    }`}
                            >
                                <span className="text-xl">{type.icon}</span>
                                <p className="text-xs font-medium mt-1">{type.label}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Question Content */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h3 className="font-bold text-text-main mb-3">Question Prompt</h3>
                    <textarea
                        value={formData.prompt}
                        onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                        placeholder="Enter your question here..."
                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary outline-none min-h-[120px]"
                    />
                </div>

                {/* MCQ Options */}
                {formData.type === 'mcq' && (
                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-text-main">Answer Options</h3>
                            <button onClick={addOption} className="text-sm text-primary hover:underline">
                                + Add Option
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formData.options.map((option, index) => (
                                <div key={option.id} className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        checked={option.isCorrect}
                                        onChange={() => updateOption(option.id, 'isCorrect', true)}
                                        className="w-4 h-4 text-primary"
                                    />
                                    <input
                                        type="text"
                                        value={option.text}
                                        onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none"
                                    />
                                    {formData.options.length > 2 && (
                                        <button
                                            onClick={() => removeOption(option.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-text-muted mt-2">Select the radio button next to the correct answer</p>
                    </div>
                )}

                {/* Short Answer / CER */}
                {['short', 'cer', 'case', 'data', 'error_analysis'].includes(formData.type) && (
                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-text-main mb-3">Expected Answer / Rubric</h3>
                        <textarea
                            value={formData.expected_answer}
                            onChange={(e) => setFormData({ ...formData, expected_answer: e.target.value })}
                            placeholder="Describe the expected answer or grading criteria..."
                            className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary outline-none min-h-[100px]"
                        />
                    </div>
                )}

                {/* Metadata */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h3 className="font-bold text-text-main mb-3">Question Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-text-muted">Subject</label>
                            <select
                                value={formData.subject_id}
                                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value, topic_id: '' })}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none"
                            >
                                <option value="">Select subject</option>
                                {subjects?.map(s => (
                                    <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-text-muted">Topic (Optional)</label>
                            <select
                                value={formData.topic_id}
                                onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none"
                                disabled={!formData.subject_id}
                            >
                                <option value="">Select topic</option>
                                {topics?.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-text-muted">Grade Band</label>
                            <select
                                value={formData.grade_band}
                                onChange={(e) => setFormData({ ...formData, grade_band: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none"
                            >
                                <option value="K-3">K-3 (Kindergarten - Grade 3)</option>
                                <option value="4-6">4-6 (Elementary)</option>
                                <option value="SMP">SMP (Junior High)</option>
                                <option value="SMA">SMA (Senior High)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-text-muted">Grade Level</label>
                            <select
                                value={formData.grade}
                                onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value) })}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                                    <option key={g} value={g}>Grade {g}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Difficulty & HOTS */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h3 className="font-bold text-text-main mb-3">Difficulty & Cognitive Level</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-text-muted">Your Difficulty Rating</label>
                            <div className="flex gap-2 mt-2">
                                {['easy', 'medium', 'hard'].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setFormData({ ...formData, teacher_difficulty: d })}
                                        className={`flex-1 py-2 rounded-lg border font-medium capitalize ${formData.teacher_difficulty === d
                                            ? d === 'easy' ? 'bg-green-100 border-green-400 text-green-700'
                                                : d === 'medium' ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                                                    : 'bg-red-100 border-red-400 text-red-700'
                                            : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={formData.teacher_hots_claim}
                                onChange={(e) => setFormData({ ...formData, teacher_hots_claim: e.target.checked })}
                                className="w-5 h-5 text-primary rounded"
                            />
                            <div>
                                <p className="font-medium text-text-main">This is a HOTS question</p>
                                <p className="text-xs text-text-muted">Requires analysis, evaluation, or creation (Bloom 4-6)</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setStep('list')}
                        className="flex-1 py-3 rounded-xl border border-gray-200 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={step === 'create' ? handleCreateQuestion : handleUpdateQuestion}
                        disabled={isSubmitting || !formData.prompt}
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : step === 'create' ? 'Save as Draft' : 'Save Changes'}
                    </button>
                </div>

                {step === 'edit' && selectedQuestion?.status === 'draft' && (
                    <button
                        onClick={handleSubmitForReview}
                        disabled={isAnalyzing || !formData.prompt}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50"
                    >
                        {isAnalyzing ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Analyzing with AI...
                            </span>
                        ) : (
                            '🤖 Submit for AI Review'
                        )}
                    </button>
                )}

                {/* Document Uploader Modal */}
                {showDocumentUploader && (
                    <DocumentUploader
                        onQuestionsExtracted={handleDocumentImport}
                        onClose={() => setShowDocumentUploader(false)}
                    />
                )}
            </div>
        );
    }

    // Review View
    if (step === 'review') {
        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => setStep('list')} className="flex items-center gap-2 text-text-muted">
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back
                    </button>
                    <h2 className="text-lg font-bold text-text-main">📊 Question Review</h2>
                    <div></div>
                </div>

                {selectedQuestion && (
                    <>
                        <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${getStatusBadgeColor(selectedQuestion.status)}-100 text-${getStatusBadgeColor(selectedQuestion.status)}-600`}>
                                    {getStatusLabel(selectedQuestion.status)}
                                </span>
                            </div>
                            <h3 className="font-bold text-text-main mb-2">Question</h3>
                            <p className="text-text-main">{selectedQuestion.prompt}</p>

                            {selectedQuestion.type === 'mcq' && selectedQuestion.options && (
                                <div className="mt-3 space-y-1">
                                    {selectedQuestion.options.map((opt, i) => (
                                        <div key={opt.id} className={`p-2 rounded-lg ${opt.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                                            {String.fromCharCode(65 + i)}. {opt.text} {opt.isCorrect && '✓'}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <AIReviewPanel questionId={selectedQuestion.id} />
                    </>
                )}
            </div>
        );
    }

    // Import Review View
    if (step === 'import_review') {
        return (
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => { setImportedQuestions([]); setStep('list'); }} className="flex items-center gap-2 text-text-muted">
                        <span className="material-symbols-outlined">arrow_back</span>
                        Batal
                    </button>
                    <h2 className="text-lg font-bold text-text-main">📋 Review Soal Import ({importedQuestions.length})</h2>
                    <button
                        onClick={saveImportedQuestions}
                        disabled={isSubmitting || importedQuestions.filter(q => q.selected).length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium disabled:opacity-50"
                    >
                        {isSubmitting ? 'Menyimpan...' : `💾 Simpan ${importedQuestions.filter(q => q.selected).length} Soal`}
                    </button>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                    <p className="text-sm text-blue-700">
                        💡 Review dan analisa soal sebelum menyimpan. Klik "Analisa AI" untuk melihat Bloom level, kesulitan, dan rekomendasi.
                    </p>
                </div>

                <div className="space-y-4">
                    {importedQuestions.map((q, index) => (
                        <div key={q.id} className={`bg-card-light rounded-xl p-4 border-2 transition-colors ${q.selected ? 'border-green-300' : 'border-gray-200 opacity-60'}`}>
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={q.selected}
                                    onChange={() => setImportedQuestions(prev => prev.map((item, i) =>
                                        i === index ? { ...item, selected: !item.selected } : item
                                    ))}
                                    className="w-5 h-5 mt-1 rounded text-green-600"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                            {q.type?.toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs ${q.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                                            q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {q.difficulty || 'medium'}
                                        </span>
                                    </div>

                                    <p className="text-gray-800 mb-2">{q.prompt}</p>

                                    {q.options && (
                                        <div className="space-y-1 mb-3">
                                            {q.options.map((opt, optIdx) => (
                                                <div key={optIdx} className={`text-sm px-2 py-1 rounded ${opt.isCorrect ? 'bg-green-100 text-green-700' : 'text-gray-600'}`}>
                                                    {String.fromCharCode(65 + optIdx)}. {opt.text} {opt.isCorrect && '✓'}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* AI Analysis */}
                                    {q.aiAnalysis ? (
                                        <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                                            <h4 className="font-medium text-purple-800 mb-2">🤖 Analisis AI</h4>
                                            {q.aiAnalysis.error ? (
                                                <p className="text-red-600 text-sm">❌ {q.aiAnalysis.error}</p>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div><span className="text-gray-600">Bloom:</span> <span className="font-medium">{q.aiAnalysis.bloom_level} ({q.aiAnalysis.bloom_label})</span></div>
                                                    <div><span className="text-gray-600">HOTS:</span> <span className={`font-medium ${q.aiAnalysis.is_hots ? 'text-green-600' : 'text-gray-600'}`}>{q.aiAnalysis.is_hots ? 'Ya ✓' : 'Tidak'}</span></div>
                                                    <div><span className="text-gray-600">Kesulitan:</span> <span className="font-medium">{q.aiAnalysis.difficulty?.level} ({q.aiAnalysis.difficulty?.score}/10)</span></div>
                                                    <div><span className="text-gray-600">Kualitas:</span> <span className="font-medium">{q.aiAnalysis.quality_flag}</span></div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => analyzeImportedQuestion(index)}
                                            className="mt-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                                        >
                                            🔍 Analisa AI
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => { setImportedQuestions([]); setStep('create'); }}
                        className="flex-1 py-3 rounded-xl border border-gray-200 font-medium"
                    >
                        Batal
                    </button>
                    <button
                        onClick={async () => {
                            for (let i = 0; i < importedQuestions.length; i++) {
                                if (!importedQuestions[i].aiAnalysis) await analyzeImportedQuestion(i);
                            }
                        }}
                        className="flex-1 py-3 rounded-xl bg-purple-100 text-purple-700 font-medium"
                    >
                        🔍 Analisa Semua
                    </button>
                    <button
                        onClick={saveImportedQuestions}
                        disabled={isSubmitting || importedQuestions.filter(q => q.selected).length === 0}
                        className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
                    >
                        {isSubmitting ? 'Menyimpan...' : '💾 Simpan'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
