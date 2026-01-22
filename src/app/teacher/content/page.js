'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubjects, useClasses, useAssessments, createRecord, deleteRecord } from '@/hooks/useSupabaseData';
import { processImage, formatFileSize } from '@/lib/fileUtils';

export default function TeacherContentPage() {
    const { user } = useAuth();
    const { data: subjects, loading: subjectsLoading } = useSubjects();
    const { data: allClasses, loading: classesLoading } = useClasses({ teacher_id: user?.id });
    const { data: allAssessments, loading: assessmentsLoading, refetch: refetchAssessments } = useAssessments();

    const [step, setStep] = useState('list'); // list, type, questions, settings, preview
    const [assessmentType, setAssessmentType] = useState('multiple_choice');
    const [formData, setFormData] = useState({
        title: '',
        subject_id: '',
        type: 'multiple_choice',
        questions: [],
        settings: {
            aiHints: true,
            hintLimit: 3,
            allowSkip: true,
            allowRedo: false,
            realtimeFeedback: true,
            tabLock: false,
            allowImageAnswer: false,
        },
        start_date: '',
        due_date: '',
        class_id: '',
    });
    const [saving, setSaving] = useState(false);

    const isLoading = subjectsLoading || classesLoading || assessmentsLoading;
    const classes = allClasses;

    // Filter quizzes created by this teacher (excluding games)
    const myQuizzes = allAssessments.filter(a =>
        a.teacher_id === user?.id &&
        a.type !== 'game'
    );

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this quiz?')) {
            try {
                await deleteRecord('assessments', id);
                refetchAssessments();
            } catch (error) {
                alert('Error deleting: ' + error.message);
            }
        }
    };

    const addQuestion = () => {
        const newQuestion = {
            id: crypto.randomUUID(),
            type: 'mc',
            prompt: '',
            promptImage: null,
            options: [
                { id: '1', text: '', image: null, isCorrect: false },
                { id: '2', text: '', image: null, isCorrect: false },
                { id: '3', text: '', image: null, isCorrect: false },
                { id: '4', text: '', image: null, isCorrect: false },
            ],
        };
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, newQuestion],
        }));
    };

    const updateQuestion = (qIndex, updates) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => i === qIndex ? { ...q, ...updates } : q),
        }));
    };

    const deleteQuestion = (qIndex) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== qIndex),
        }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const assessment = {
                ...formData,
                type: assessmentType,
                teacher_id: user?.id,
            };
            await createRecord('assessments', assessment);
            alert('Quiz created successfully!');
            // Reset form
            alert('Quiz created successfully!');
            // Reset form
            setStep('list');
            refetchAssessments();
            setFormData({
                title: '',
                subject_id: '',
                type: 'multiple_choice',
                questions: [],
                settings: { aiHints: true, hintLimit: 3, allowSkip: true, allowRedo: false, realtimeFeedback: true, tabLock: false, allowImageAnswer: false },
                start_date: '',
                due_date: '',
                class_id: '',
            });
        } catch (error) {
            alert('Error creating quiz: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                {step !== 'list' && (
                    <button onClick={() => setStep(step === 'type' ? 'list' : step === 'questions' ? 'type' : step === 'settings' ? 'questions' : 'settings')}>
                        <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                    </button>
                )}
                <h2 className="text-lg font-bold text-text-main flex-1 text-center">
                    {step === 'list' ? 'My Quizzes' : 'Create Quiz'}
                </h2>
                {step === 'questions' && (
                    <button onClick={() => setStep('settings')} className="text-primary font-semibold">
                        Save
                    </button>
                )}
            </div>

            {/* Step: List Quizzes */}
            {step === 'list' && (
                <div className="space-y-4">
                    {myQuizzes.length > 0 ? (
                        <div className="space-y-3">
                            {myQuizzes.map((quiz) => {
                                const subject = subjects.find(s => s.id === quiz.subject_id);
                                const assignedClass = classes.find(c => c.id === quiz.class_id);
                                return (
                                    <div key={quiz.id} className="bg-card-light p-4 rounded-xl border border-gray-100 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                                                {quiz.type === 'drawing' ? '🎨' : quiz.type === 'essay' ? '✏️' : '📝'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-text-main">{quiz.title}</h4>
                                                <div className="flex gap-2 text-xs text-text-muted mt-0.5">
                                                    {subject && <span>{subject.name}</span>}
                                                    <span>•</span>
                                                    <span>{quiz.questions?.length || 0} questions</span>
                                                    {assignedClass && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="bg-gray-100 px-1.5 rounded">{assignedClass.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDelete(quiz.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                                                title="Delete Quiz"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-text-muted">
                            <p className="text-4xl mb-3">📝</p>
                            <p>No quizzes created yet.</p>
                        </div>
                    )}

                    <button
                        onClick={() => setStep('type')}
                        className="fixed bottom-24 right-4 flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full shadow-lg font-bold"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Create Quiz
                    </button>
                </div>
            )}

            {/* Step: Choose Type */}
            {step === 'type' && (
                <div className="space-y-4">
                    <p className="text-text-muted text-center">Choose assessment type</p>

                    <div className="space-y-3">
                        {[
                            { type: 'multiple_choice', icon: '📝', label: 'Multiple Choice Quiz', desc: 'Quick auto-graded questions' },
                            { type: 'essay', icon: '✏️', label: 'Essay / Short Answer', desc: 'Open-ended responses' },
                            { type: 'drawing', icon: '🎨', label: 'Drawing Quiz', desc: 'Students answer with drawings' },
                            { type: 'written_exam', icon: '📋', label: 'Written Exam', desc: 'Exam mode with tab lock' },
                        ].map((item) => (
                            <button
                                key={item.type}
                                onClick={() => {
                                    setAssessmentType(item.type);
                                    // Auto-enable drawing for drawing quiz type
                                    if (item.type === 'drawing') {
                                        setFormData(prev => ({
                                            ...prev,
                                            settings: { ...prev.settings, allowImageAnswer: true }
                                        }));
                                    }
                                    setStep('questions');
                                    if (formData.questions.length === 0) addQuestion();
                                }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card-light border border-gray-100 hover:border-primary transition-colors text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                                    {item.icon}
                                </div>
                                <div>
                                    <p className="font-bold text-text-main">{item.label}</p>
                                    <p className="text-sm text-text-muted">{item.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step: Build Questions */}
            {step === 'questions' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Quiz Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Solar System Explorer"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                        />
                    </div>

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

                    {/* Questions */}
                    {formData.questions.map((question, qIndex) => (
                        <QuestionCard
                            key={question.id}
                            question={question}
                            index={qIndex}
                            onUpdate={(updates) => updateQuestion(qIndex, updates)}
                            onDelete={() => deleteQuestion(qIndex)}
                            type={assessmentType}
                            allowImageAnswer={formData.settings.allowImageAnswer}
                        />
                    ))}

                    <button
                        onClick={addQuestion}
                        className="w-full py-4 border-2 border-dashed border-primary text-primary rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Add Question
                    </button>
                </div>
            )}

            {/* Step: Settings */}
            {step === 'settings' && (
                <div className="space-y-4">
                    <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-4">
                        <h3 className="font-bold text-text-main">Quiz Settings</h3>

                        <ToggleSetting
                            label="Enable AI hints"
                            value={formData.settings.aiHints}
                            onChange={(v) => setFormData({ ...formData, settings: { ...formData.settings, aiHints: v } })}
                        />

                        <ToggleSetting
                            label="Allow skip questions"
                            value={formData.settings.allowSkip}
                            onChange={(v) => setFormData({ ...formData, settings: { ...formData.settings, allowSkip: v } })}
                        />

                        <ToggleSetting
                            label="Allow redo questions"
                            value={formData.settings.allowRedo}
                            onChange={(v) => setFormData({ ...formData, settings: { ...formData.settings, allowRedo: v } })}
                        />

                        <ToggleSetting
                            label="Allow image answers"
                            value={formData.settings.allowImageAnswer}
                            onChange={(v) => setFormData({ ...formData, settings: { ...formData.settings, allowImageAnswer: v } })}
                        />

                        {assessmentType === 'multiple_choice' && (
                            <ToggleSetting
                                label="Show real-time feedback"
                                value={formData.settings.realtimeFeedback}
                                onChange={(v) => setFormData({ ...formData, settings: { ...formData.settings, realtimeFeedback: v } })}
                                description="Show correct/incorrect immediately after answering"
                            />
                        )}

                        {assessmentType === 'written_exam' && (
                            <ToggleSetting
                                label="Tab lock / focus mode"
                                value={formData.settings.tabLock}
                                onChange={(v) => setFormData({ ...formData, settings: { ...formData.settings, tabLock: v } })}
                            />
                        )}
                    </div>

                    <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-4">
                        <h3 className="font-bold text-text-main">Schedule</h3>

                        <div>
                            <label className="block text-sm text-text-muted mb-1">Start Date & Time</label>
                            <input
                                type="datetime-local"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                            />
                        </div>

                        {assessmentType !== 'written_exam' && (
                            <div>
                                <label className="block text-sm text-text-muted mb-1">Deadline</label>
                                <input
                                    type="datetime-local"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-text-main mb-3">Assign to Class</h3>
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

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep('preview')}
                            className="flex-1 py-3 bg-blue-100 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>visibility</span>
                            Preview
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                        >
                            {saving ? 'Creating...' : 'Create Quiz'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step: Preview */}
            {step === 'preview' && (
                <QuizPreview
                    quiz={{
                        ...formData,
                        type: assessmentType,
                    }}
                    subjects={subjects}
                    onBack={() => setStep('settings')}
                    onPublish={handleSubmit}
                />
            )}
        </div>
    );
}

function QuestionCard({ question, index, onUpdate, onDelete, type, allowImageAnswer }) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const result = await processImage(file);

        if (result.success) {
            onUpdate({ promptImage: result.data });
        } else {
            setError(result.error);
        }

        setUploading(false);
    };

    const handleOptionImageUpload = async (optIndex, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const result = await processImage(file);

        if (result.success) {
            const newOptions = question.options.map((opt, i) =>
                i === optIndex ? { ...opt, image: result.data } : opt
            );
            onUpdate({ options: newOptions });
        } else {
            alert(result.error);
        }
    };

    const updateOption = (optIndex, updates) => {
        const newOptions = question.options.map((opt, i) =>
            i === optIndex ? { ...opt, ...updates } : opt
        );
        onUpdate({ options: newOptions });
    };

    const setCorrectOption = (optIndex) => {
        const newOptions = question.options.map((opt, i) => ({
            ...opt,
            isCorrect: i === optIndex,
        }));
        onUpdate({ options: newOptions });
    };

    return (
        <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-text-main">Question {index + 1}</h4>
                <div className="flex gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-text-muted">Multiple Choice</span>
                    <button onClick={onDelete} className="text-red-500">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                    </button>
                </div>
            </div>

            <textarea
                value={question.prompt}
                onChange={(e) => onUpdate({ prompt: e.target.value })}
                placeholder="Type your question here..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none resize-none"
            />

            {/* Question Image Upload */}
            <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${question.promptImage ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary'
                    }`}
            >
                {question.promptImage ? (
                    <div className="relative">
                        <img
                            src={question.promptImage}
                            alt="Question"
                            className="max-h-40 mx-auto rounded-lg"
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdate({ promptImage: null });
                            }}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                        </button>
                    </div>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 32 }}>
                            {uploading ? 'hourglass_empty' : 'image'}
                        </span>
                        <p className="text-sm text-text-muted mt-1">
                            {uploading ? 'Uploading...' : 'Click to upload image'}
                        </p>
                        <p className="text-xs text-text-muted">JPG, PNG (max 2MB)</p>
                    </>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />
            </div>

            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}

            {type === 'essay' && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-blue-600">info</span>
                        <p className="font-bold text-blue-700">Manual Grading</p>
                    </div>
                    <p className="text-sm text-blue-600">
                        Essay answers are graded manually by the teacher.
                        No answer key is needed.
                    </p>
                </div>
            )}

            {type === 'multiple_choice' && (
                <div className="space-y-2">
                    <p className="text-sm text-text-muted">Answers (Select correct answer)</p>
                    {question.options.map((opt, i) => (
                        <div key={opt.id} className="flex items-center gap-2">
                            <button
                                onClick={() => setCorrectOption(i)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${opt.isCorrect ? 'bg-primary border-primary' : 'border-gray-300'
                                    }`}
                            >
                                {opt.isCorrect && (
                                    <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>check</span>
                                )}
                            </button>

                            {allowImageAnswer && opt.image ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <img src={opt.image} alt={`Option ${i + 1}`} className="h-12 rounded" />
                                    <button
                                        onClick={() => updateOption(i, { image: null })}
                                        className="text-red-500 text-sm"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => updateOption(i, { text: e.target.value })}
                                    placeholder={`Option ${i + 1}`}
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm"
                                />
                            )}

                            {allowImageAnswer && !opt.image && (
                                <label className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                                    <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 18 }}>add_photo_alternate</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleOptionImageUpload(i, e)}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ToggleSetting({ label, value, onChange, description }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <span className="text-sm text-text-main">{label}</span>
                {description && (
                    <p className="text-xs text-text-muted">{description}</p>
                )}
            </div>
            <button
                onClick={() => onChange(!value)}
                className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ml-2 ${value ? 'bg-primary' : 'bg-gray-300'
                    }`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'
                    }`} />
            </button>
        </div>
    );
}

function QuizPreview({ quiz, subjects, onBack, onPublish }) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    const question = quiz.questions[currentQuestion];
    const totalQuestions = quiz.questions.length;
    const subject = subjects.find(s => s.id === quiz.subject_id);

    if (!question) {
        return (
            <div className="space-y-4">
                <button onClick={onBack} className="flex items-center gap-2 text-text-muted">
                    <span className="material-symbols-outlined">arrow_back</span>
                    Back to Settings
                </button>
                <div className="bg-yellow-50 rounded-xl p-6 text-center border border-yellow-200">
                    <span className="text-4xl mb-3 block">📝</span>
                    <p className="text-yellow-700 font-medium">No questions to preview</p>
                    <p className="text-sm text-yellow-600">Add some questions to see the preview.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-text-muted">
                    <span className="material-symbols-outlined">arrow_back</span>
                    Back
                </button>
                <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                    👁️ Preview Mode
                </span>
            </div>

            {/* Quiz Info */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl p-4">
                <h3 className="font-bold text-text-main text-lg">{quiz.title || 'Untitled Quiz'}</h3>
                <div className="flex items-center gap-2 mt-1">
                    {subject && (
                        <span className="text-sm text-text-muted">{subject.emoji} {subject.name}</span>
                    )}
                    <span className="text-sm text-text-muted">•</span>
                    <span className="text-sm text-text-muted">{totalQuestions} questions</span>
                </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
                    />
                </div>
                <span className="text-sm font-bold text-primary">{currentQuestion + 1}/{totalQuestions}</span>
            </div>

            {/* Question Card (Simulated Student View) */}
            <div className="bg-card-light rounded-2xl p-5 border border-gray-100 shadow-sm">
                {/* Question */}
                <p className="text-lg font-semibold text-text-main mb-4">{question.prompt || 'Question text...'}</p>

                {question.promptImage && (
                    <img
                        src={question.promptImage}
                        alt="Question"
                        className="max-h-40 rounded-xl mb-4 mx-auto"
                    />
                )}

                {/* Options */}
                <div className="space-y-2">
                    {question.options?.map((option, i) => (
                        <button
                            key={option.id}
                            onClick={() => setSelectedAnswer(option.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${selectedAnswer === option.id
                                ? option.isCorrect
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-red-500 bg-red-50'
                                : 'border-gray-200 hover:border-primary/50'
                                }`}
                        >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${selectedAnswer === option.id
                                ? option.isCorrect
                                    ? 'bg-green-500 text-white'
                                    : 'bg-red-500 text-white'
                                : 'bg-gray-100 text-text-muted'
                                }`}>
                                {String.fromCharCode(65 + i)}
                            </span>
                            {option.image ? (
                                <img src={option.image} alt="" className="h-10 rounded" />
                            ) : (
                                <span className="text-text-main">{option.text || `Option ${i + 1}`}</span>
                            )}
                            {selectedAnswer === option.id && option.isCorrect && (
                                <span className="ml-auto text-green-600">✓ Correct</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
                <button
                    onClick={() => {
                        setCurrentQuestion(c => Math.max(0, c - 1));
                        setSelectedAnswer(null);
                    }}
                    disabled={currentQuestion === 0}
                    className="flex-1 py-3 bg-gray-100 text-text-muted font-bold rounded-xl disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => {
                        setCurrentQuestion(c => Math.min(totalQuestions - 1, c + 1));
                        setSelectedAnswer(null);
                    }}
                    disabled={currentQuestion === totalQuestions - 1}
                    className="flex-1 py-3 bg-gray-100 text-text-muted font-bold rounded-xl disabled:opacity-50"
                >
                    Next
                </button>
            </div>

            {/* Publish Button */}
            <button
                onClick={onPublish}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined">publish</span>
                Publish Quiz
            </button>

            {/* Settings Summary */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-bold text-text-main mb-2">⚙️ Quiz Settings</p>
                <div className="grid grid-cols-2 gap-2 text-text-muted">
                    <span>AI Hints: {quiz.settings?.aiHints ? '✅ On' : '❌ Off'}</span>
                    <span>Skip: {quiz.settings?.allowSkip ? '✅ On' : '❌ Off'}</span>
                    <span>Feedback: {quiz.settings?.realtimeFeedback ? '✅ On' : '❌ Off'}</span>
                    <span>Tab Lock: {quiz.settings?.tabLock ? '✅ On' : '❌ Off'}</span>
                </div>
            </div>
        </div>
    );
}

