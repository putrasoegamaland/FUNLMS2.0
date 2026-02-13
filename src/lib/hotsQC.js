/**
 * HOTS Question Quality Control - AI Analysis
 * Uses Gemini AI to analyze questions for Bloom level, HOTS, difficulty, and boundedness
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY)
    : null;

// Subject-specific rubrics for more accurate classification
const SUBJECT_RUBRICS = {
    science: {
        name: 'Science (IPA)',
        bloom_signals: {
            1: 'Recall terms, laws, units, definitions',
            2: 'Explain concept; interpret simple diagram',
            3: 'Apply formula or standard procedure to a scenario',
            4: 'Interpret data; identify variables; cause-effect; compare experiments',
            5: 'Critique conclusions; choose best method using criteria (validity, reliability, safety)',
            6: 'Design investigation/solution under constraints (tools, time, controls)'
        },
        hots_triggers: [
            'Data/graph interpretation with reasoning',
            'Experimental design with constraints/controls',
            'Evaluation using explicit criteria'
        ],
        risk_flags: [
            'Missing variables/control definition',
            'Too complex datasets for grade',
            'Requires outside niche knowledge'
        ]
    },
    math: {
        name: 'Math (Matematika)',
        bloom_signals: {
            1: 'Recall formula/definition',
            2: 'Explain meaning of steps; interpret representation',
            3: 'Solve using known procedure',
            4: 'Compare strategies; debug errors; case analysis; pattern/structure analysis',
            5: 'Judge method correctness/efficiency using criteria',
            6: 'Construct model/rule; generalization; create problem/solution under constraints'
        },
        hots_triggers: [
            'Error analysis (debug)',
            'Compare 2 methods + justify choice',
            'Modeling with assumptions'
        ],
        risk_flags: [
            'Ambiguous constraints leading to multiple correct answers',
            'Too many steps with no scaffold',
            'Heavy reading word problems'
        ]
    },
    english: {
        name: 'English',
        bloom_signals: {
            1: 'Vocabulary/grammar recall',
            2: 'Summarize/paraphrase; main idea',
            3: 'Apply grammar/vocab to produce short text',
            4: 'Analyze tone/structure/purpose; compare perspectives; identify fallacies',
            5: 'Evaluate argument credibility/strength using criteria (bias, relevance, evidence)',
            6: 'Create/transform text for audience/purpose with constraints'
        },
        hots_triggers: [
            'Requires evidence from text',
            'Evaluates arguments with criteria',
            'Rewrite/transform for specified audience/purpose'
        ],
        risk_flags: [
            'Reading too long without scaffold',
            'Cultural knowledge not provided',
            'Missing writing rubric'
        ]
    },
    civics: {
        name: 'Civics (PPKn)',
        bloom_signals: {
            1: 'Recall principles/institutions',
            2: 'Explain meaning/values; roles',
            3: 'Apply rules/values to straightforward case',
            4: 'Analyze stakeholders; rights/duties conflicts; causal chain',
            5: 'Evaluate policy/action using criteria (justice, legality, public good, rights)',
            6: 'Propose program/policy with constraints + steps + success metrics'
        },
        hots_triggers: [
            'Explicit criteria & trade-offs',
            'Stakeholder table / cause-effect mapping',
            'Constrained solution proposal with implementation steps'
        ],
        risk_flags: [
            'Opinion-only prompts without criteria',
            'Scenario lacking context',
            'Sensitive topics needing neutrality'
        ]
    },
    economy: {
        name: 'Economy (Ekonomi)',
        bloom_signals: {
            1: 'Define terms (inflation, demand, GDP)',
            2: 'Explain relationships (cause-effect) simply',
            3: 'Compute/basic interpretation (graphs, simple metrics)',
            4: 'Analyze trends, causal chains, compare market outcomes using data/scenario',
            5: 'Evaluate policy options with criteria (efficiency, equity, stability, feasibility)',
            6: 'Design strategy/business/policy proposal with assumptions + constraints + risk'
        },
        hots_triggers: [
            'Decision table with criteria + trade-offs',
            'Data interpretation + justification',
            'Constrained policy/business proposal'
        ],
        risk_flags: [
            'Claims without evidence requirement',
            'Ambiguous variables/timeframe',
            'Math-heavy without required data/formula'
        ]
    }
};

// Grade band reading limits
const READING_LIMITS = {
    'K-3': 100,
    '4-6': 200,
    'SMP': 300,
    'SMA': 500
};

/**
 * Generate the QC prompt for Gemini
 */
function generateQCPrompt(question, subjectKey, gradeBand) {
    const rubric = SUBJECT_RUBRICS[subjectKey] || SUBJECT_RUBRICS.science;
    const readingLimit = READING_LIMITS[gradeBand] || 300;

    return `You are an expert education quality analyst. Analyze this question for a ${gradeBand} level ${rubric.name} assessment.

## Question to Analyze
Type: ${question.type}
Prompt: ${question.prompt}
${question.options?.length ? `Options: ${JSON.stringify(question.options)}` : ''}
${question.expected_answer ? `Expected Answer: ${question.expected_answer}` : ''}
${question.rubric ? `Rubric: ${JSON.stringify(question.rubric)}` : ''}
Teacher-declared difficulty: ${question.teacher_difficulty || 'not specified'}
Teacher claims HOTS: ${question.teacher_hots_claim ? 'yes' : 'no'}

## Subject Rubric: ${rubric.name}

### Bloom Level Signals
${Object.entries(rubric.bloom_signals).map(([level, desc]) => `B${level}: ${desc}`).join('\n')}

### HOTS Triggers (Strong signals for Bloom 4-6)
${rubric.hots_triggers.map(t => `• ${t}`).join('\n')}

### Common Risk Flags
${rubric.risk_flags.map(f => `• ${f}`).join('\n')}

## Definitions

### Bloom's Taxonomy (1-6)
Assign ONE primary level based on the HIGHEST cognitive action required:
1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create

### HOTS (Higher-Order Thinking Skills)
HOTS = Bloom 4-6 AND includes at least one HOTS signal:
- Compare/contrast with reasoning
- Identify relationships/patterns/inference
- Debug reasoning / error analysis
- Evaluate options using criteria/trade-offs
- Create/design solution under constraints

HOTS Strength:
- S2 (Strong): explicit criteria/constraints/evidence/debug required
- S1 (Medium): "explain why" but weaker structure
- S0 (Weak): sounds HOTS but output is still recall/summary

### Boundedness
- B2 (Good): all info provided + clear output format + time/scope + rubric criteria
- B1 (Partial): some elements unclear but still answerable
- B0 (Bad): requires external research / missing key info / ambiguous grading

### Difficulty Score (0-10)
Calculate from:
- Steps/complexity (0-4): 1 step=0, 2 steps=1, 3-4=2, 5-6=3, 7+=4
- Prerequisite load (0-3): 1 concept=0, 2=1, 3=2, 4+=3
- Reading/data load (0-3): short=0, moderate=1, heavy=2, long+complex=3

Map: 0-3=easy, 4-6=medium, 7-10=hard

Reading limit for ${gradeBand}: ${readingLimit} words

## Your Task
Analyze the question and output ONLY valid JSON matching this exact schema:

{
  "primary_bloom_level": <integer 1-6>,
  "secondary_bloom_levels": [<integers>],
  "hots": {
    "flag": <boolean>,
    "strength": "<S0|S1|S2>",
    "signals": ["<detected HOTS signals>"]
  },
  "boundedness": "<B0|B1|B2>",
  "difficulty": {
    "score_1_10": <integer 0-10>,
    "label": "<easy|medium|hard>",
    "reasons": ["<reason strings>"]
  },
  "quality": {
    "clarity_score_0_100": <integer>,
    "ambiguity_flags": ["<issues>"],
    "missing_info_flags": ["<missing items>"],
    "grade_fit_flags": ["<grade appropriateness issues>"]
  },
  "alignment": {
    "subject_match_score_0_100": <integer>,
    "topic_match_score_0_100": <integer>
  },
  "suggested_edits": [
    {
      "goal": "<reduce_ambiguity|make_easier|make_harder|add_hots|improve_clarity>",
      "change_summary": "<brief description>",
      "before": "<original snippet>",
      "after": "<suggested replacement>"
    }
  ],
  "confidence": {
    "bloom": <decimal 0.00-1.00>,
    "hots": <decimal 0.00-1.00>,
    "difficulty": <decimal 0.00-1.00>,
    "boundedness": <decimal 0.00-1.00>
  },
  "model_version": "qc-v1"
}

Output ONLY the JSON object, no other text.`;
}

/**
 * Parse and validate the AI response
 */
function parseQCResponse(responseText) {
    try {
        // Clean the response (remove markdown code blocks if present)
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
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned);

        // Validate required fields
        const required = ['primary_bloom_level', 'boundedness', 'difficulty', 'hots', 'confidence'];
        for (const field of required) {
            if (!(field in parsed)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate ranges
        if (parsed.primary_bloom_level < 1 || parsed.primary_bloom_level > 6) {
            throw new Error('primary_bloom_level must be 1-6');
        }

        if (!['B0', 'B1', 'B2'].includes(parsed.boundedness)) {
            throw new Error('boundedness must be B0, B1, or B2');
        }

        if (!['S0', 'S1', 'S2'].includes(parsed.hots?.strength)) {
            throw new Error('hots.strength must be S0, S1, or S2');
        }

        if (!['easy', 'medium', 'hard'].includes(parsed.difficulty?.label)) {
            throw new Error('difficulty.label must be easy, medium, or hard');
        }

        return { success: true, data: parsed };
    } catch (error) {
        console.error('Error parsing QC response:', error);
        return { success: false, error: error.message, raw: responseText };
    }
}

/**
 * Run AI QC analysis on a question
 */
export async function analyzeQuestion(question, subjectKey = 'science', gradeBand = 'SMP') {
    if (!genAI) {
        console.error('Gemini API not configured');
        return { success: false, error: 'AI not configured' };
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.2,  // Low temperature for more consistent output
                topP: 0.8,
                maxOutputTokens: 2000,
            }
        });

        const prompt = generateQCPrompt(question, subjectKey, gradeBand);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const parsed = parseQCResponse(text);

        if (parsed.success) {
            return {
                success: true,
                data: {
                    ...parsed.data,
                    full_json_report: parsed.data,
                    model_version: 'qc-v1'
                }
            };
        } else {
            return parsed;
        }
    } catch (error) {
        console.error('Error analyzing question:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if Gemini is configured
 */
export function isQCConfigured() {
    return !!genAI;
}

/**
 * Get subject rubric for display
 */
export function getSubjectRubric(subjectKey) {
    return SUBJECT_RUBRICS[subjectKey] || null;
}

/**
 * Get all available subjects
 */
export function getAvailableSubjects() {
    return Object.entries(SUBJECT_RUBRICS).map(([key, value]) => ({
        key,
        name: value.name
    }));
}

// Export for testing
export { SUBJECT_RUBRICS, READING_LIMITS, generateQCPrompt, parseQCResponse };
