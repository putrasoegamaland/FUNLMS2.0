/**
 * Student Hint AI Service
 * Provides guided hints without revealing answers
 * Enforces quotas and guardrails
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getHintCount, logHintRequest } from '@/hooks/useSupabaseData';

// Initialize Gemini
const genAI = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY)
    : null;

// Hint quotas by grade band
const HINT_QUOTAS = {
    'K-3': 5,
    '4-6': 4,
    'SMP': 3,
    'SMA': 3
};

// Allowed hint types with descriptions
const HINT_TYPES = {
    clarify: {
        name: 'Simplify Question',
        description: 'Explain the question in simpler language',
        icon: '🔍',
        prompt: 'Explain this question in simpler, more accessible language suitable for a student. Do not reveal the answer.'
    },
    socratic: {
        name: 'Guiding Questions',
        description: 'Ask questions that guide thinking',
        icon: '💭',
        prompt: 'Ask 2-3 Socratic questions that will help the student think through this problem without revealing the answer.'
    },
    next_step: {
        name: 'Next Step',
        description: 'Suggest what to do next',
        icon: '👣',
        prompt: 'Suggest the next step the student should take to solve this problem. Do not provide the final answer.'
    },
    checklist: {
        name: 'Checklist',
        description: 'Rubric/criteria checklist',
        icon: '✅',
        prompt: 'Provide a checklist of criteria the student should check their answer against. Do not reveal the expected answer.'
    },
    template: {
        name: 'Structure Help',
        description: 'Sentence starters or templates',
        icon: '📝',
        prompt: 'Provide sentence starters or a structural template to help the student organize their response. Do not fill in the content.'
    },
    background: {
        name: 'Concept Review',
        description: 'Explain related concepts',
        icon: '📚',
        prompt: 'Explain the background concepts needed to understand this question. Do not solve the problem or reveal the answer.'
    }
};

// Strict guardrails in the system prompt
const SYSTEM_PROMPT = `You are a helpful tutor assistant for students. Your role is to GUIDE students toward understanding, NOT to give them answers.

STRICT RULES - YOU MUST FOLLOW THESE:
1. NEVER reveal the final answer or solution
2. NEVER reveal which MCQ option is correct
3. NEVER write a complete essay or response for the student
4. NEVER compute final numerical answers
5. NEVER solve the problem end-to-end

YOUR ROLE IS TO:
- Clarify confusing parts of questions
- Ask guiding questions that lead to insight
- Suggest the next step without doing it
- Provide structure and templates
- Explain background concepts
- Encourage and motivate

If the student directly asks for the answer, politely redirect them to think through the problem.

Respond in a friendly, encouraging tone appropriate for a student learner.
Keep responses concise (under 150 words) and focused.`;

/**
 * Check if hint is allowed (quota not exceeded)
 */
export async function checkHintQuota(studentId, questionId, gradeBand = 'SMP') {
    const quota = HINT_QUOTAS[gradeBand] || 3;
    const used = await getHintCount(studentId, questionId);

    return {
        allowed: used < quota,
        used,
        remaining: Math.max(0, quota - used),
        quota
    };
}

/**
 * Get available hint types
 */
export function getHintTypes() {
    return Object.entries(HINT_TYPES).map(([key, value]) => ({
        key,
        ...value
    }));
}

/**
 * Request a hint for a question
 */
export async function requestHint(
    studentId,
    questionId,
    attemptId,
    question,
    hintType,
    studentMessage = '',
    gradeBand = 'SMP'
) {
    // Check quota first
    const quotaStatus = await checkHintQuota(studentId, questionId, gradeBand);
    if (!quotaStatus.allowed) {
        return {
            success: false,
            error: 'hint_quota_exceeded',
            message: `You've used all ${quotaStatus.quota} hints for this question. Try your best!`,
            quotaStatus
        };
    }

    if (!genAI) {
        return {
            success: false,
            error: 'ai_not_configured',
            message: 'AI hints are not available'
        };
    }

    const hintConfig = HINT_TYPES[hintType];
    if (!hintConfig) {
        return {
            success: false,
            error: 'invalid_hint_type',
            message: 'Invalid hint type requested'
        };
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 300,
            },
            systemInstruction: SYSTEM_PROMPT
        });

        // Build the prompt
        let userPrompt = `QUESTION FOR STUDENT:
${question.prompt}

${question.type === 'mcq' && question.options ?
                `OPTIONS:
${question.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.text}`).join('\n')}`
                : ''}

HINT TYPE REQUESTED: ${hintConfig.name}
INSTRUCTION: ${hintConfig.prompt}

${studentMessage ? `STUDENT'S SPECIFIC QUESTION: ${studentMessage}` : ''}

Remember: Do NOT reveal the answer. Guide the student to find it themselves.`;

        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        const hintText = response.text();

        // Log the hint request
        const tokensUsed = (userPrompt.length + hintText.length) / 4; // Rough estimate
        await logHintRequest(
            studentId,
            questionId,
            attemptId,
            hintType,
            studentMessage || hintConfig.name,
            hintText,
            Math.round(tokensUsed)
        );

        // Get updated quota
        const newQuotaStatus = await checkHintQuota(studentId, questionId, gradeBand);

        return {
            success: true,
            hint: hintText,
            hintType,
            quotaStatus: newQuotaStatus
        };

    } catch (error) {
        console.error('Error generating hint:', error);
        return {
            success: false,
            error: 'generation_failed',
            message: 'Failed to generate hint. Please try again.'
        };
    }
}

/**
 * Post-process hint to catch any answer leakage (additional safety)
 */
function sanitizeHint(hint, question) {
    // This is a backup check - the AI should already not reveal answers
    // Add specific checks based on question type if needed

    let sanitized = hint;

    // For MCQ, check if it mentions "correct answer is" or similar
    const dangerousPhrases = [
        /the correct answer is/gi,
        /the answer is/gi,
        /choose option/gi,
        /select option/gi,
        /the right answer/gi,
        /option [A-D] is correct/gi
    ];

    for (const pattern of dangerousPhrases) {
        if (pattern.test(sanitized)) {
            console.warn('Hint contained potential answer reveal, replacing...');
            sanitized = "I can't give you the answer directly, but let me help you think through this. What concepts do you think are important for solving this problem?";
        }
    }

    return sanitized;
}

/**
 * Check if hint AI is configured
 */
export function isHintAIConfigured() {
    return !!genAI;
}

export { HINT_TYPES, HINT_QUOTAS };
