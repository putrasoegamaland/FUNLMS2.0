/**
 * FunLMS Kids - Gemini AI Integration
 * Provides AI-powered hints for quiz questions and material Q&A
 */

// API configuration - uses environment variable for security
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// Updated to use Gemini 2.0 Flash model (faster and more capable)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Check if Gemini AI is configured
 */
export function isGeminiConfigured() {
    return !!GEMINI_API_KEY;
}

/**
 * Get API key (for internal use only)
 */
export function getApiKey() {
    return GEMINI_API_KEY;
}

/**
 * Generate a hint for a quiz question
 * @param {Object} question - The question object
 * @param {string} question.prompt - The question text
 * @param {Array} question.options - Answer options (for multiple choice)
 * @param {string} studentLevel - e.g., "kindergarten", "grade1", "grade2"
 * @param {Object} context - Optional material context
 * @returns {Promise<string>} The hint text
 */
export async function generateHint(question, studentLevel = 'elementary', context = null) {
    if (!GEMINI_API_KEY) {
        return generateFallbackHint(question);
    }

    try {
        const prompt = buildHintPrompt(question, studentLevel, context);

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 150,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            }),
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status);
            return generateFallbackHint(question);
        }

        const data = await response.json();
        const hint = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (hint) {
            return hint.trim();
        }

        return generateFallbackHint(question);
    } catch (error) {
        console.error('Error generating hint:', error);
        return generateFallbackHint(question);
    }
}

/**
 * Build the prompt for Gemini
 */
function buildHintPrompt(question, studentLevel, context = null) {
    const levelDescriptions = {
        kindergarten: 'a 5-6 year old kindergarten student',
        grade1: 'a 6-7 year old first grader',
        grade2: 'a 7-8 year old second grader',
        grade3: 'an 8-9 year old third grader',
        elementary: 'a young elementary school student',
    };

    const levelDesc = levelDescriptions[studentLevel] || levelDescriptions.elementary;

    let optionsText = '';
    if (question.options && question.options.length > 0) {
        optionsText = `\nThe answer options are:\n${question.options.map((opt, i) =>
            `${i + 1}. ${opt.text || 'Image option'}`
        ).join('\n')}`;
    }

    let contextText = '';
    if (context) {
        contextText = `\n\nContext from learning material:\nTopic: ${context.title || 'General'}\nDescription: ${context.description || 'No description available'}`;
    }

    return `You are a friendly, encouraging tutor helping ${levelDesc} with a quiz question.

Question: "${question.prompt || 'What is the answer?'}"${optionsText}${contextText}

Provide a SHORT, helpful hint that:
1. Does NOT give away the answer directly
2. Uses simple words a child would understand
3. Gives a clue or reminds them of a related concept
4. Is encouraging and positive
5. Is 1-2 sentences maximum

Respond with ONLY the hint text, nothing else.`;
}

/**
 * Generate a fallback hint when API is not available
 */
function generateFallbackHint(question) {
    const hints = [
        "💡 Think about what you've learned in class!",
        "💡 Read the question carefully one more time.",
        "💡 Try to picture the answer in your mind.",
        "💡 You're doing great! Take your time and think.",
        "💡 Remember what your teacher taught you about this topic.",
        "💡 Look for clues in the question itself.",
        "💡 If you're not sure, try to eliminate wrong answers first.",
        "💡 Think about similar questions you've answered before.",
    ];

    // Try to give more specific hints based on question content
    const prompt = (question.prompt || '').toLowerCase();

    if (prompt.includes('math') || prompt.includes('number') || prompt.includes('+') || prompt.includes('-')) {
        return "💡 Try counting on your fingers or drawing it out!";
    }

    if (prompt.includes('read') || prompt.includes('word') || prompt.includes('letter')) {
        return "💡 Sound out the letters slowly. What sound does it make?";
    }

    if (prompt.includes('animal') || prompt.includes('bird') || prompt.includes('fish')) {
        return "💡 Think about where this animal lives and what it looks like.";
    }

    if (prompt.includes('color') || prompt.includes('colour')) {
        return "💡 Look around you - can you see this color anywhere?";
    }

    if (prompt.includes('shape')) {
        return "💡 Count the sides and corners to help you remember!";
    }

    // Return a random general hint
    return hints[Math.floor(Math.random() * hints.length)];
}

/**
 * Generate an explanation for a wrong answer
 */
export async function generateExplanation(question, wrongAnswer, correctAnswer, studentLevel = 'elementary') {
    if (!GEMINI_API_KEY) {
        return "Keep trying! Review this topic and you'll get it next time. 💪";
    }

    try {
        const prompt = `You are a kind tutor explaining to a young student why their answer was incorrect.

Question: "${question.prompt}"
Student's answer: "${wrongAnswer}"
Correct answer: "${correctAnswer}"

Explain briefly (2 sentences max) why the correct answer is right, in simple words a child can understand. Be encouraging!`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 100,
                },
            }),
        });

        if (!response.ok) {
            return "Keep practicing! You're learning every day. 🌟";
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            "Keep practicing! You're learning every day. 🌟";
    } catch (error) {
        return "Keep practicing! You're learning every day. 🌟";
    }
}

/**
 * Ask a question about learning material
 * @param {string} userQuestion - The student's question
 * @param {Object} material - The learning material context
 * @param {string} material.title - Material title
 * @param {string} material.description - Material description
 * @param {string} studentLevel - Student's grade level
 * @returns {Promise<string>} The AI response
 */
export async function askAboutMaterial(userQuestion, material, studentLevel = 'elementary') {
    if (!GEMINI_API_KEY) {
        return "🤖 Sorry, the AI helper is not available right now. Ask your teacher for help!";
    }

    if (!userQuestion || userQuestion.trim().length < 3) {
        return "🤔 Can you ask a longer question? I want to help you learn!";
    }

    try {
        const levelDescriptions = {
            kindergarten: 'a 5-6 year old kindergarten student',
            grade1: 'a 6-7 year old first grader',
            grade2: 'a 7-8 year old second grader',
            grade3: 'an 8-9 year old third grader',
            elementary: 'a young elementary school student',
        };

        const levelDesc = levelDescriptions[studentLevel] || levelDescriptions.elementary;

        // Build comprehensive book context
        let bookContext = '';
        if (material) {
            bookContext = `📚 Book Title: "${material.title || 'Unknown Book'}"`;

            if (material.author) {
                bookContext += `\n✍️ Author: ${material.author}`;
            }

            if (material.description) {
                bookContext += `\n📝 Book Summary: ${material.description}`;
            }

            if (material.subject) {
                bookContext += `\n📖 Subject: ${material.subject}`;
            }

            // Include the actual book content if available (content_text field)
            if (material.content_text) {
                // Limit to first 3000 chars to avoid token limits while giving AI enough context
                const contentPreview = material.content_text.length > 3000
                    ? material.content_text.substring(0, 3000) + '\n...[more content in book]'
                    : material.content_text;
                bookContext += `\n\n📄 FULL BOOK CONTENT:\n${contentPreview}`;
            }

            // Add any educational notes
            bookContext += `\n\nIMPORTANT: Use the FULL BOOK CONTENT above to answer questions. The AI should:
- Reference SPECIFIC parts of the book content when answering
- Quote or paraphrase actual passages from the book
- Help the student understand what they read
- If asked about specific pages or parts, use the content provided`;
        }

        const prompt = `You are a friendly, encouraging AI tutor helping ${levelDesc} learn from a book.

The student is reading:
${bookContext || 'A learning book'}

The student asks: "${userQuestion}"

Provide a helpful, educational response that:
1. Uses simple words a child can understand
2. Is encouraging and positive
3. RELATES DIRECTLY to the book's content, themes, and educational goals
4. Explains concepts from the book if the student asks about them
5. Is 2-4 sentences maximum
6. Uses emojis to make it fun and engaging
7. Does NOT provide direct answers to test/quiz questions
8. Encourages the student to explore the book further

Respond with ONLY your answer, nothing else.`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 200,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API error:', response.status, errorData);

            if (response.status === 429) {
                return "🤖 I'm a bit tired right now! Please try again in a minute. 😴";
            }

            return "🤖 Oops! Something went wrong. Try asking again or ask your teacher!";
        }

        const data = await response.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (answer) {
            return answer.trim();
        }

        return "🤔 Hmm, I'm not sure about that. Can you try asking in a different way?";
    } catch (error) {
        console.error('Error asking about material:', error);
        return "🤖 Oops! Something went wrong. Try asking again or ask your teacher!";
    }
}

/**
 * Extract questions from an image using Gemini Flash 2.0 vision
 * @param {string} imageData - Base64 encoded image data (without data: prefix)
 * @param {string} mimeType - Image MIME type (image/jpeg, image/png, etc.)
 * @returns {Promise<{success: boolean, questions: Array, error?: string}>}
 */
export async function extractQuestionsFromImage(imageData, mimeType = 'image/jpeg') {
    if (!GEMINI_API_KEY) {
        return {
            success: false,
            questions: [],
            error: 'Gemini API key not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.'
        };
    }

    try {
        // Remove data URL prefix if present
        const base64Data = imageData.includes('base64,')
            ? imageData.split('base64,')[1]
            : imageData;

        const prompt = `You are an expert at extracting questions from exam papers, worksheets, and educational materials.

Analyze this image and extract ALL questions you can find. For each question, identify:
1. The question text (prompt)
2. The question type: 'mc' (multiple choice), 'essay' (long answer), 'fill_blank' (fill in the blank), 'true_false' (true/false)
3. For multiple choice: extract all options and identify which one is correct (if marked)
4. For fill in the blank: identify the expected answer if visible

Return a JSON array with this exact format:
[
  {
    "type": "mc",
    "prompt": "What is 2 + 2?",
    "options": [
      {"id": "1", "text": "3", "isCorrect": false},
      {"id": "2", "text": "4", "isCorrect": true},
      {"id": "3", "text": "5", "isCorrect": false},
      {"id": "4", "text": "6", "isCorrect": false}
    ]
  },
  {
    "type": "essay",
    "prompt": "Explain the water cycle in your own words."
  },
  {
    "type": "fill_blank",
    "prompt": "The capital of France is ___.",
    "correctAnswer": "Paris"
  },
  {
    "type": "true_false",
    "prompt": "The sun rises in the east.",
    "correctAnswer": "true"
  }
]

IMPORTANT:
- Return ONLY the JSON array, no other text
- If no questions are found, return an empty array: []
- Keep question text exactly as written in the image
- For multiple choice without marked answers, set all isCorrect to false
- Number options with sequential IDs starting from "1"`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 8192,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OCR API error:', errorText);

            if (response.status === 429) {
                return {
                    success: false,
                    questions: [],
                    error: 'Rate limit reached. Please wait a moment and try again.'
                };
            }

            return {
                success: false,
                questions: [],
                error: `API error: ${response.status}`
            };
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            return {
                success: false,
                questions: [],
                error: 'No response from AI. The image may be unclear or contain no questions.'
            };
        }

        // Parse JSON from response (handle markdown code blocks)
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }

        try {
            const questions = JSON.parse(jsonText);

            // Validate and normalize questions
            const normalizedQuestions = questions.map((q, index) => ({
                id: crypto.randomUUID(),
                type: q.type || 'mc',
                prompt: q.prompt || `Question ${index + 1}`,
                promptImage: null,
                options: q.type === 'mc' ? (q.options || []).map((opt, i) => ({
                    id: opt.id || String(i + 1),
                    text: opt.text || '',
                    image: null,
                    isCorrect: opt.isCorrect || false
                })) : undefined,
                correctAnswer: q.correctAnswer,
            }));

            return {
                success: true,
                questions: normalizedQuestions
            };
        } catch (parseError) {
            console.error('Error parsing OCR response:', parseError, responseText);
            return {
                success: false,
                questions: [],
                error: 'Failed to parse extracted questions. Please try with a clearer image.'
            };
        }
    } catch (error) {
        console.error('Error extracting questions:', error);
        return {
            success: false,
            questions: [],
            error: 'Failed to process image. Please try again.'
        };
    }
}

export default {
    isGeminiConfigured,
    getApiKey,
    generateHint,
    generateExplanation,
    askAboutMaterial,
    extractQuestionsFromImage,
};
