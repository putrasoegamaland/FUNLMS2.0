-- Run this SQL in your Supabase SQL Editor to fix the schema errors

-- 1. Fix assessments table (missing teacher_id, subject_id, dates)
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- 2. Fix assessments type constraint (to allow multiple_choice, drawing, games, etc.)
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_type_check;
ALTER TABLE assessments ADD CONSTRAINT assessments_type_check 
    CHECK (type IN ('quiz', 'exam', 'essay', 'written', 'multiple_choice', 'written_exam', 'drawing', 'game'));

-- 3. Fix videos table (missing teacher_id, subject_id)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- 4. Fix books table (missing teacher_id and switching from class_ids array to single class_id)
ALTER TABLE books ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE books ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- 5. Add level column to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Grade 1';

-- 6. Create the attempts table (for quiz submissions and grading)
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    score INTEGER, -- NULL means waiting for manual grade
    answers JSONB DEFAULT '{}',
    violations INTEGER DEFAULT 0,
    forced_submit BOOLEAN DEFAULT false,
    teacher_score INTEGER,
    teacher_feedback TEXT,
    graded_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to attempts table (if it already exists)
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}';
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS violations INTEGER DEFAULT 0;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS forced_submit BOOLEAN DEFAULT false;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS teacher_score INTEGER;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 7. Enforce single enrollment per student (one class at a time)
-- First, remove any duplicate enrollments keeping only the latest
DELETE FROM enrollments a USING enrollments b
WHERE a.id < b.id AND a.student_id = b.student_id;

-- Then create unique index
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_single_class ON enrollments(student_id);

-- 8. Add graded_at to submissions if missing
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
