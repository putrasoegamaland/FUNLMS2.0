-- OCR and Question Bank Schema Update
-- Run this in Supabase SQL Editor

-- Question Bank table (per-teacher question storage)
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    
    -- Question content
    type TEXT NOT NULL CHECK (type IN ('mc', 'essay', 'drawing', 'fill_blank', 'true_false')),
    prompt TEXT NOT NULL,
    prompt_image TEXT,  -- Base64 or URL
    options JSONB,      -- For multiple choice: [{id, text, image, isCorrect}]
    correct_answer TEXT, -- For fill_blank or simple answers
    explanation TEXT,    -- Why this is the correct answer
    
    -- Metadata for organization
    tags TEXT[] DEFAULT '{}',
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    source TEXT,        -- e.g., "Textbook Chapter 5", "Final Exam 2024"
    
    -- Stats
    times_used INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin viewing all questions with teacher info
CREATE INDEX IF NOT EXISTS idx_question_bank_teacher ON question_bank(teacher_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_created ON question_bank(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON question_bank(subject_id);

-- Teacher Activity table (for admin monitoring)
CREATE TABLE IF NOT EXISTS teacher_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,  -- More flexible: create_quiz, grade_submission, add_question, etc.
    entity_id UUID,           -- ID of the created/edited entity
    entity_title TEXT,        -- Title for quick display
    metadata JSONB DEFAULT '{}',  -- Additional context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_activity_teacher ON teacher_activity(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_activity_created ON teacher_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_activity_type ON teacher_activity(activity_type);

-- Student Activity table (for teacher/admin monitoring)
CREATE TABLE IF NOT EXISTS student_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,  -- quiz_completed, book_read, video_watched, game_played, assignment_submitted, login
    entity_id UUID,               -- ID of the quiz/book/video/game
    entity_title TEXT,            -- Title for quick display
    metadata JSONB DEFAULT '{}',  -- Additional context (score, timeSpent, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_activity_student ON student_activity(student_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_created ON student_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_activity_type ON student_activity(activity_type);

-- Enable RLS
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (to allow re-running this script)
DROP POLICY IF EXISTS "Teachers can view own questions" ON question_bank;
DROP POLICY IF EXISTS "Teachers can insert own questions" ON question_bank;
DROP POLICY IF EXISTS "Teachers can update own questions" ON question_bank;
DROP POLICY IF EXISTS "Teachers can delete own questions" ON question_bank;
DROP POLICY IF EXISTS "Public read question_bank" ON question_bank;
DROP POLICY IF EXISTS "Public insert question_bank" ON question_bank;
DROP POLICY IF EXISTS "Public update question_bank" ON question_bank;
DROP POLICY IF EXISTS "Public delete question_bank" ON question_bank;

DROP POLICY IF EXISTS "View teacher activity" ON teacher_activity;
DROP POLICY IF EXISTS "Insert teacher activity" ON teacher_activity;
DROP POLICY IF EXISTS "Public read teacher_activity" ON teacher_activity;
DROP POLICY IF EXISTS "Public insert teacher_activity" ON teacher_activity;

DROP POLICY IF EXISTS "View student activity" ON student_activity;
DROP POLICY IF EXISTS "Insert student activity" ON student_activity;
DROP POLICY IF EXISTS "Public read student_activity" ON student_activity;
DROP POLICY IF EXISTS "Public insert student_activity" ON student_activity;

-- RLS Policies for question_bank
-- Teachers can manage their own questions
CREATE POLICY "Teachers can view own questions" ON question_bank
    FOR SELECT USING (auth.uid()::text = teacher_id::text OR 
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Teachers can insert own questions" ON question_bank
    FOR INSERT WITH CHECK (auth.uid()::text = teacher_id::text);

CREATE POLICY "Teachers can update own questions" ON question_bank
    FOR UPDATE USING (auth.uid()::text = teacher_id::text);

CREATE POLICY "Teachers can delete own questions" ON question_bank
    FOR DELETE USING (auth.uid()::text = teacher_id::text);

-- RLS Policies for teacher_activity
-- Only admins and the teacher themselves can view activity
CREATE POLICY "View teacher activity" ON teacher_activity
    FOR SELECT USING (auth.uid()::text = teacher_id::text OR 
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Insert teacher activity" ON teacher_activity
    FOR INSERT WITH CHECK (auth.uid()::text = teacher_id::text);

-- RLS Policies for student_activity
-- Teachers and admins can view all, students can see their own
CREATE POLICY "View student activity" ON student_activity
    FOR SELECT USING (auth.uid()::text = student_id::text OR 
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'teacher')));

CREATE POLICY "Insert student activity" ON student_activity
    FOR INSERT WITH CHECK (auth.uid()::text = student_id::text);

-- Public access policies (for demo/development without auth)
CREATE POLICY "Public read question_bank" ON question_bank FOR SELECT USING (true);
CREATE POLICY "Public insert question_bank" ON question_bank FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update question_bank" ON question_bank FOR UPDATE USING (true);
CREATE POLICY "Public delete question_bank" ON question_bank FOR DELETE USING (true);

CREATE POLICY "Public read teacher_activity" ON teacher_activity FOR SELECT USING (true);
CREATE POLICY "Public insert teacher_activity" ON teacher_activity FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read student_activity" ON student_activity FOR SELECT USING (true);
CREATE POLICY "Public insert student_activity" ON student_activity FOR INSERT WITH CHECK (true);
