-- Test Quiz for QC Review
-- Run this in Supabase SQL Editor to create a test quiz that should appear in the admin review queue

-- First, ensure the columns exist (run this first if not done already)
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';

ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS teacher_hots_claim BOOLEAN DEFAULT FALSE;

ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS qc_status TEXT DEFAULT 'approved';

-- Insert a test quiz with pending_review status
INSERT INTO assessments (
    title,
    type,
    difficulty,
    teacher_hots_claim,
    qc_status,
    questions,
    settings,
    created_at
) VALUES (
    'HOTS Test Quiz - Pending Review',
    'multiple_choice',
    'hard',
    true,
    'pending_review',
    '[
        {
            "id": "q1-test",
            "prompt": "Analyze the following scenario: A ball is thrown upward. At what point is the kinetic energy maximum?",
            "type": "mcq",
            "difficulty": "hard",
            "options": [
                {"id": "a", "text": "At the highest point", "isCorrect": false},
                {"id": "b", "text": "Just after release", "isCorrect": true},
                {"id": "c", "text": "Halfway up", "isCorrect": false},
                {"id": "d", "text": "Never", "isCorrect": false}
            ]
        },
        {
            "id": "q2-test",
            "prompt": "Evaluate the statement: All squares are rectangles, but not all rectangles are squares. Explain why this is true.",
            "type": "mcq",
            "difficulty": "hard",
            "options": [
                {"id": "a", "text": "Because squares have 4 sides", "isCorrect": false},
                {"id": "b", "text": "Because rectangles have right angles", "isCorrect": false},
                {"id": "c", "text": "Because squares have equal sides while rectangles only need opposite sides equal", "isCorrect": true},
                {"id": "d", "text": "This statement is false", "isCorrect": false}
            ]
        }
    ]'::jsonb,
    '{"aiHints": true, "hintLimit": 3}'::jsonb,
    NOW()
);

-- Verify the insertion
SELECT id, title, difficulty, teacher_hots_claim, qc_status 
FROM assessments 
WHERE qc_status = 'pending_review';
