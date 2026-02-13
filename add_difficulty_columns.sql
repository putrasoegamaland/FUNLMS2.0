-- Add difficulty and HOTS columns to assessments table
-- Run this in Supabase SQL Editor

-- Add difficulty column (easy, medium, hard)
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';

-- Add teacher_hots_claim column (boolean)
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS teacher_hots_claim BOOLEAN DEFAULT FALSE;

-- Add QC status column for review workflow
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS qc_status TEXT DEFAULT 'approved';

-- Add comment
COMMENT ON COLUMN assessments.difficulty IS 'Teacher-declared difficulty: easy, medium, or hard';
COMMENT ON COLUMN assessments.teacher_hots_claim IS 'Teacher claims this is a HOTS (Higher-Order Thinking Skills) assessment';
COMMENT ON COLUMN assessments.qc_status IS 'QC review status: approved, pending_review, rejected';
