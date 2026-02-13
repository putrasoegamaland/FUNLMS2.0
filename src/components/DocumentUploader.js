'use client';

import { useState, useRef } from 'react';
import { parseDocumentAndExtractQuestions, isDocumentParserConfigured } from '@/lib/documentParser';

/**
 * Document Uploader Component
 * Allows teachers to upload Word/PDF files and extract questions using AI
 */
export default function DocumentUploader({ onQuestionsExtracted, onClose }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('upload'); // upload, processing, results
    const [progress, setProgress] = useState('');
    const [extractedQuestions, setExtractedQuestions] = useState([]);
    const [selectedQuestions, setSelectedQuestions] = useState(new Set());
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setError('');

        // Check file type
        const validExtensions = ['.docx', '.doc', '.pdf'];
        const fileName = selectedFile.name.toLowerCase();
        const isValid = validExtensions.some(ext => fileName.endsWith(ext));

        if (!isValid) {
            setError('Format file tidak didukung. Gunakan file Word (.docx) atau PDF (.pdf)');
            return;
        }

        // Check file size (max 20MB)
        if (selectedFile.size > 20 * 1024 * 1024) {
            setError('File terlalu besar. Maksimal 20MB.');
            return;
        }

        setFile(selectedFile);
    };

    const handleExtract = async () => {
        if (!file) {
            setError('Silakan pilih file terlebih dahulu');
            return;
        }

        if (!isDocumentParserConfigured()) {
            setError('AI tidak dikonfigurasi. Tambahkan NEXT_PUBLIC_GEMINI_API_KEY ke .env.local');
            return;
        }

        setLoading(true);
        setError('');
        setStep('processing');
        setProgress('Membaca dokumen...');

        try {
            // Small delay to show progress
            await new Promise(r => setTimeout(r, 500));
            setProgress('Mengekstrak teks...');

            await new Promise(r => setTimeout(r, 500));
            setProgress('AI sedang menganalisis soal...');

            const result = await parseDocumentAndExtractQuestions(file);

            if (!result.success) {
                setError(result.error || 'Gagal mengekstrak soal');
                setStep('upload');
                return;
            }

            setExtractedQuestions(result.questions);
            setSelectedQuestions(new Set(result.questions.map(q => q.id)));
            setStep('results');

        } catch (err) {
            console.error('Extraction error:', err);
            setError('Terjadi kesalahan: ' + err.message);
            setStep('upload');
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    const toggleQuestion = (id) => {
        setSelectedQuestions(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedQuestions.size === extractedQuestions.length) {
            setSelectedQuestions(new Set());
        } else {
            setSelectedQuestions(new Set(extractedQuestions.map(q => q.id)));
        }
    };

    const handleImport = () => {
        const questionsToImport = extractedQuestions
            .filter(q => selectedQuestions.has(q.id))
            .map(q => ({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); })),
                type: q.type === 'mcq' ? 'mc' : q.type,
                prompt: q.prompt,
                difficulty: q.difficulty || 'medium',
                promptImage: null,
                options: q.options ? q.options.map((opt, idx) => ({
                    id: String(idx + 1),
                    text: opt.text,
                    image: null,
                    isCorrect: opt.isCorrect || false
                })) : [
                    { id: '1', text: '', image: null, isCorrect: false },
                    { id: '2', text: '', image: null, isCorrect: false },
                    { id: '3', text: '', image: null, isCorrect: false },
                    { id: '4', text: '', image: null, isCorrect: false },
                ]
            }));

        onQuestionsExtracted(questionsToImport);
        onClose();
    };

    const getFileIcon = () => {
        if (!file) return '📄';
        const name = file.name.toLowerCase();
        if (name.endsWith('.pdf')) return '📕';
        if (name.endsWith('.docx') || name.endsWith('.doc')) return '📘';
        return '📄';
    };

    const getQuestionTypeLabel = (type) => {
        switch (type) {
            case 'mcq': return 'Pilihan Ganda';
            case 'essay': return 'Essay';
            case 'truefalse': return 'Benar/Salah';
            case 'short_answer': return 'Jawaban Singkat';
            default: return type;
        }
    };

    const getDifficultyColor = (diff) => {
        switch (diff) {
            case 'easy': return 'bg-green-100 text-green-700';
            case 'hard': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-500">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        📄 Upload Dokumen Soal
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {/* Upload Step */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <div className="text-center py-8">
                                <div className="text-5xl mb-4">{getFileIcon()}</div>
                                <h3 className="font-bold text-gray-800 mb-2">Upload Dokumen Quiz/Exam</h3>
                                <p className="text-gray-500 text-sm mb-4">
                                    Unggah file Word (.docx) atau PDF yang berisi soal-soal
                                </p>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".docx,.doc,.pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                                >
                                    📁 Pilih File
                                </button>
                            </div>

                            {/* Selected File Preview */}
                            {file && (
                                <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                                    <span className="text-3xl">{getFileIcon()}</span>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-800">{file.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                    ❌ {error}
                                </div>
                            )}

                            {/* Tips */}
                            <div className="bg-blue-50 rounded-xl p-4">
                                <h4 className="font-medium text-blue-800 mb-2">💡 Tips</h4>
                                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                                    <li>Pastikan soal terformat dengan jelas (bernomor)</li>
                                    <li>Untuk pilihan ganda, gunakan A/B/C/D atau 1/2/3/4</li>
                                    <li>Jika ada kunci jawaban, AI akan menandai jawaban benar</li>
                                    <li>Maksimal ukuran file: 20MB</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Processing Step */}
                    {step === 'processing' && (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="font-bold text-gray-800 mb-2">Memproses Dokumen</h3>
                            <p className="text-gray-500">{progress}</p>
                        </div>
                    )}

                    {/* Results Step */}
                    {step === 'results' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-800">
                                        ✅ {extractedQuestions.length} Soal Ditemukan
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Pilih soal yang ingin diimport
                                    </p>
                                </div>
                                <button
                                    onClick={toggleAll}
                                    className="text-sm text-blue-500 hover:underline"
                                >
                                    {selectedQuestions.size === extractedQuestions.length ? 'Hapus Semua' : 'Pilih Semua'}
                                </button>
                            </div>

                            {/* Questions List */}
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {extractedQuestions.map((q, idx) => (
                                    <div
                                        key={q.id}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedQuestions.has(q.id)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        onClick={() => toggleQuestion(q.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${selectedQuestions.has(q.id)
                                                ? 'border-blue-500 bg-blue-500 text-white'
                                                : 'border-gray-300'
                                                }`}>
                                                {selectedQuestions.has(q.id) && '✓'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="text-sm font-medium text-gray-500">
                                                        #{idx + 1}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                                        {getQuestionTypeLabel(q.type)}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(q.difficulty)}`}>
                                                        {q.difficulty}
                                                    </span>
                                                </div>
                                                <p className="text-gray-800 text-sm line-clamp-2">
                                                    {q.prompt}
                                                </p>
                                                {q.options && (
                                                    <div className="mt-2 space-y-1">
                                                        {q.options.slice(0, 4).map((opt, optIdx) => (
                                                            <div key={optIdx} className={`text-xs flex items-center gap-1 ${opt.isCorrect ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                                                                <span>{String.fromCharCode(65 + optIdx)}.</span>
                                                                <span className="line-clamp-1">{opt.text}</span>
                                                                {opt.isCorrect && <span>✓</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {extractedQuestions.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <span className="text-4xl">😕</span>
                                    <p className="mt-2">Tidak ada soal yang ditemukan dalam dokumen</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-between">
                    {step === 'upload' && (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleExtract}
                                disabled={!file || loading}
                                className="px-6 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                🔍 Ekstrak Soal
                            </button>
                        </>
                    )}

                    {step === 'results' && (
                        <>
                            <button
                                onClick={() => {
                                    setStep('upload');
                                    setExtractedQuestions([]);
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                ← Upload Lagi
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={selectedQuestions.size === 0}
                                className="px-6 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ✅ Import {selectedQuestions.size} Soal
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
