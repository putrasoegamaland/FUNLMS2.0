import { generateUUID } from './uuid';
/**
 * Document Parser Library
 * Parses Word (.docx) and PDF files to extract text for AI question extraction
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY)
    : null;

/**
 * Parse Word document (.docx) to extract text
 * @param {File} file - The Word document file
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
export async function parseWordDocument(file) {
    try {
        // Dynamic import mammoth for client-side only
        const mammoth = await import('mammoth');

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        return {
            success: true,
            text: result.value,
            messages: result.messages
        };
    } catch (error) {
        console.error('Error parsing Word document:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Parse PDF document to extract text from all pages
 * @param {File} file - The PDF file
 * @returns {Promise<{success: boolean, text?: string, pageCount?: number, error?: string}>}
 */
export async function parsePDFDocument(file) {
    try {
        // Dynamic import pdf.js
        const pdfjsLib = await import('pdfjs-dist');

        // Use unpkg CDN which is more reliable, or disable worker for simplicity
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        } catch (e) {
            // Fallback: disable worker (will use main thread, slower but works)
            console.warn('PDF.js worker setup failed, using main thread');
            pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const pageTexts = [];

        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            pageTexts.push(pageText);
            fullText += pageText + '\n\n';
        }

        return {
            success: true,
            text: fullText.trim(),
            pageCount: pdf.numPages,
            pageTexts
        };
    } catch (error) {
        console.error('Error parsing PDF document:', error);
        return {
            success: false,
            error: 'Gagal membaca file PDF: ' + error.message
        };
    }
}

/**
 * Use AI to extract structured questions from document text
 * @param {string} text - The extracted document text
 * @param {object} options - Extraction options
 * @returns {Promise<{success: boolean, questions?: array, error?: string}>}
 */
export async function extractQuestionsWithAI(text, options = {}) {
    if (!genAI) {
        return {
            success: false,
            error: 'Gemini AI not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to .env.local'
        };
    }

    const {
        questionType = 'auto', // auto, mcq, essay, truefalse
        subject = 'general',
        language = 'id' // Indonesian
    } = options;

    const prompt = `Anda adalah asisten pendidikan yang ahli mengekstrak soal dari dokumen.

Analisis teks dokumen berikut dan ekstrak semua soal yang ditemukan.

TEKS DOKUMEN:
"""
${text.substring(0, 15000)}
"""

INSTRUKSI:
1. Identifikasi setiap soal dalam dokumen
2. Tentukan tipe soal: "mcq" (pilihan ganda), "essay", "truefalse", "short_answer"
3. Untuk soal pilihan ganda, identifikasi opsi jawaban dan mana yang benar (jika ada kunci jawaban)
4. Estimasi tingkat kesulitan: "easy", "medium", "hard"
5. Jika tidak ada kunci jawaban, set isCorrect: null untuk semua opsi

OUTPUT FORMAT (JSON array):
{
  "questions": [
    {
      "type": "mcq",
      "prompt": "Teks pertanyaan",
      "difficulty": "medium",
      "options": [
        {"text": "Pilihan A", "isCorrect": false},
        {"text": "Pilihan B", "isCorrect": true},
        {"text": "Pilihan C", "isCorrect": false},
        {"text": "Pilihan D", "isCorrect": false}
      ]
    },
    {
      "type": "essay",
      "prompt": "Pertanyaan essay",
      "difficulty": "hard",
      "expectedAnswer": "Ringkasan jawaban jika ada"
    }
  ],
  "metadata": {
    "totalQuestions": 10,
    "hasAnswerKey": true,
    "documentType": "quiz/exam/worksheet"
  }
}

Kembalikan HANYA JSON yang valid, tanpa teks tambahan.`;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 8000,
            }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();

        // Parse JSON response
        let parsed;
        try {
            // Clean markdown code blocks if present
            let cleaned = responseText.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.slice(7);
            }
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.slice(3);
            }
            if (cleaned.endsWith('```')) {
                cleaned = cleaned.slice(0, -3);
            }
            parsed = JSON.parse(cleaned.trim());
        } catch (parseError) {
            console.error('Failed to parse AI response:', responseText);
            return {
                success: false,
                error: 'Gagal memproses respons AI. Format tidak valid.',
                rawResponse: responseText
            };
        }

        // Normalize questions
        const questions = (parsed.questions || []).map((q, idx) => ({
            id: generateUUID(),
            type: q.type || 'mcq',
            prompt: q.prompt || '',
            difficulty: q.difficulty || 'medium',
            options: q.type === 'mcq' ? (q.options || []).map((opt, optIdx) => ({
                id: String(optIdx + 1),
                text: opt.text || '',
                isCorrect: opt.isCorrect || false
            })) : undefined,
            expectedAnswer: q.expectedAnswer,
            originalIndex: idx + 1
        }));

        return {
            success: true,
            questions,
            metadata: parsed.metadata || {},
            totalExtracted: questions.length
        };

    } catch (error) {
        console.error('Error extracting questions with AI:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Main function to parse any supported document and extract questions
 * @param {File} file - The document file
 * @param {object} options - Extraction options
 * @returns {Promise<{success: boolean, questions?: array, error?: string}>}
 */
export async function parseDocumentAndExtractQuestions(file, options = {}) {
    const fileName = file.name.toLowerCase();
    let parseResult;

    // Determine file type and parse
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        parseResult = await parseWordDocument(file);
    } else if (fileName.endsWith('.pdf')) {
        parseResult = await parsePDFDocument(file);
    } else {
        return {
            success: false,
            error: 'Format file tidak didukung. Gunakan .docx atau .pdf'
        };
    }

    if (!parseResult.success) {
        return parseResult;
    }

    // Extract questions using AI
    const extractResult = await extractQuestionsWithAI(parseResult.text, options);

    return {
        ...extractResult,
        documentText: parseResult.text.substring(0, 1000) + '...', // Preview only
        pageCount: parseResult.pageCount
    };
}

/**
 * Check if document parser is configured
 */
export function isDocumentParserConfigured() {
    return !!genAI;
}
