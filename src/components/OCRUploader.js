'use client';

import { useState, useRef } from 'react';
import { extractQuestionsFromImage, isGeminiConfigured } from '@/lib/geminiAI';

/**
 * OCR Uploader Component
 * Allows teachers to upload images or PDFs and extract questions using Gemini Vision AI
 */
export default function OCRUploader({ onQuestionsExtracted, onClose }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [extractedQuestions, setExtractedQuestions] = useState([]);
    const [step, setStep] = useState('upload'); // upload, preview, results
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setError('');
        setFile(selectedFile);

        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload an image (JPG, PNG, WebP) or PDF file.');
            return;
        }

        // Check file size (max 10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File is too large. Maximum size is 10MB.');
            return;
        }

        // Create preview
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target.result);
                setStep('preview');
            };
            reader.readAsDataURL(selectedFile);
        } else if (selectedFile.type === 'application/pdf') {
            // For PDF, we'll show a placeholder and extract first page
            setPreview('pdf');
            setStep('preview');
        }
    };

    const handleExtract = async () => {
        if (!file || !isGeminiConfigured()) {
            setError('Gemini AI is not configured. Please add your API key.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let imageData = preview;
            let mimeType = file.type;

            // For PDF, convert first page to image using pdf.js
            if (file.type === 'application/pdf') {
                try {
                    // Dynamic import of pdf.js
                    const pdfjsLib = await import('pdfjs-dist');
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

                    // Read the file as ArrayBuffer
                    const arrayBuffer = await file.arrayBuffer();

                    // Load the PDF document
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                    // Get the first page
                    const page = await pdf.getPage(1);

                    // Set scale for good quality OCR (2x for clarity)
                    const scale = 2;
                    const viewport = page.getViewport({ scale });

                    // Create canvas to render the page
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    // Render page to canvas
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;

                    // Convert canvas to base64 image
                    imageData = canvas.toDataURL('image/png');
                    mimeType = 'image/png';

                    // Show preview of the rendered page
                    setPreview(imageData);
                } catch (pdfError) {
                    console.error('PDF processing error:', pdfError);
                    setError('Failed to process PDF. Please try uploading as an image instead.');
                    setLoading(false);
                    return;
                }
            }

            // Extract questions using Gemini Vision
            const result = await extractQuestionsFromImage(imageData, mimeType);

            if (result.success) {
                setExtractedQuestions(result.questions);
                setStep('results');
            } else {
                setError(result.error || 'Failed to extract questions');
            }
        } catch (err) {
            console.error('Extraction error:', err);
            setError('Failed to process image. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = () => {
        if (extractedQuestions.length > 0) {
            onQuestionsExtracted(extractedQuestions);
        }
        onClose();
    };

    const handleRemoveQuestion = (index) => {
        setExtractedQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const resetUploader = () => {
        setFile(null);
        setPreview(null);
        setExtractedQuestions([]);
        setError('');
        setStep('upload');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600">document_scanner</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Extract Questions from Image</h2>
                            <p className="text-sm text-gray-500">
                                {step === 'upload' && 'Upload an exam paper or worksheet'}
                                {step === 'preview' && 'Review and extract questions'}
                                {step === 'results' && `Found ${extractedQuestions.length} questions`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Upload Step */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            {/* Drop zone */}
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-3xl text-purple-600">upload_file</span>
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Upload Image or PDF</h3>
                                <p className="text-gray-500 text-sm mb-4">
                                    Drag and drop or click to browse
                                </p>
                                <p className="text-xs text-gray-400">
                                    Supports: JPG, PNG, WebP, PDF (max 10MB)
                                </p>
                            </div>

                            {/* Camera capture (mobile) */}
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 p-4 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                <span className="material-symbols-outlined">photo_camera</span>
                                <span>Take a Photo</span>
                            </button>

                            {/* Hidden inputs */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {/* Tips */}
                            <div className="bg-blue-50 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">lightbulb</span>
                                    Tips for best results
                                </h4>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    <li>• Use clear, well-lit photos</li>
                                    <li>• Make sure text is readable</li>
                                    <li>• Include answer options for multiple choice</li>
                                    <li>• Works best with printed text</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Preview Step */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            {/* Image preview */}
                            {preview === 'pdf' ? (
                                <div className="bg-gray-100 rounded-xl p-8 text-center">
                                    <span className="material-symbols-outlined text-6xl text-red-500 mb-2">picture_as_pdf</span>
                                    <p className="font-medium">{file?.name}</p>
                                    <p className="text-sm text-gray-500">PDF file selected</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="w-full rounded-xl border"
                                        style={{ maxHeight: '400px', objectFit: 'contain' }}
                                    />
                                </div>
                            )}

                            {/* File info */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-gray-500">insert_drive_file</span>
                                    <div>
                                        <p className="font-medium text-sm">{file?.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {(file?.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetUploader}
                                    className="text-red-500 text-sm hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Results Step */}
                    {step === 'results' && (
                        <div className="space-y-4">
                            {extractedQuestions.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-2">search_off</span>
                                    <p className="text-gray-500">No questions found in this image</p>
                                    <button
                                        onClick={resetUploader}
                                        className="mt-4 text-purple-600 hover:underline"
                                    >
                                        Try another image
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {extractedQuestions.map((q, index) => (
                                        <div key={q.id} className="bg-gray-50 rounded-xl p-4 group">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.type === 'mc' ? 'bg-blue-100 text-blue-700' :
                                                            q.type === 'essay' ? 'bg-green-100 text-green-700' :
                                                                q.type === 'fill_blank' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-purple-100 text-purple-700'
                                                            }`}>
                                                            {q.type === 'mc' ? 'Multiple Choice' :
                                                                q.type === 'essay' ? 'Essay' :
                                                                    q.type === 'fill_blank' ? 'Fill in Blank' :
                                                                        'True/False'}
                                                        </span>
                                                        <span className="text-xs text-gray-400">#{index + 1}</span>
                                                    </div>
                                                    <p className="font-medium text-sm text-gray-900">{q.prompt}</p>

                                                    {/* Show options for MC */}
                                                    {q.type === 'mc' && q.options && (
                                                        <div className="mt-2 space-y-1">
                                                            {q.options.map((opt, i) => (
                                                                <div key={opt.id} className={`text-xs flex items-center gap-2 ${opt.isCorrect ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                                                    <span>{String.fromCharCode(65 + i)}.</span>
                                                                    <span>{opt.text}</span>
                                                                    {opt.isCorrect && <span className="material-symbols-outlined text-sm">check_circle</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Show answer for fill_blank or true_false */}
                                                    {(q.type === 'fill_blank' || q.type === 'true_false') && q.correctAnswer && (
                                                        <p className="mt-1 text-xs text-green-600">
                                                            Answer: {q.correctAnswer}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveQuestion(index)}
                                                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mt-4">
                            <span className="material-symbols-outlined text-red-500">error</span>
                            <div>
                                <p className="font-medium text-red-800">Error</p>
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                    <div>
                        {step !== 'upload' && (
                            <button
                                onClick={step === 'results' ? () => setStep('preview') : resetUploader}
                                className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                Back
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                        >
                            Cancel
                        </button>

                        {step === 'preview' && (
                            <button
                                onClick={handleExtract}
                                disabled={loading}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Extracting...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                        Extract Questions
                                    </>
                                )}
                            </button>
                        )}

                        {step === 'results' && extractedQuestions.length > 0 && (
                            <button
                                onClick={handleConfirmImport}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Import {extractedQuestions.length} Questions
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
