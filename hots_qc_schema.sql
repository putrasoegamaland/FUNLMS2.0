-- HOTS Question Quality Control System - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TOPICS TABLE (for question categorization)
-- ============================================
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    grade_band TEXT CHECK (grade_band IN ('K-3', '4-6', 'SMP', 'SMA')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUESTIONS TABLE (Core question entity with versioning)
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES questions(id),  -- For versioning
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    
    -- Content
    type TEXT DEFAULT 'mcq' CHECK (type IN ('mcq', 'short', 'cer', 'case', 'data', 'error_analysis')),
    prompt TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',  -- [{type: 'image', url: '...', caption: ''}, ...]
    options JSONB DEFAULT '[]',  -- For MCQ: [{id, text, isCorrect}]
    expected_answer TEXT,  -- For short answer / objective
    rubric JSONB,  -- For open-ended: {dimensions: [{name, weight, levels: [...]}]}
    
    -- Teacher metadata
    grade_band TEXT DEFAULT 'SMP' CHECK (grade_band IN ('K-3', '4-6', 'SMP', 'SMA')),
    grade INTEGER CHECK (grade BETWEEN 1 AND 12),
    teacher_difficulty TEXT DEFAULT 'medium' CHECK (teacher_difficulty IN ('easy', 'medium', 'hard')),
    teacher_hots_claim BOOLEAN DEFAULT false,  -- Teacher believes this is HOTS
    
    -- Status workflow
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft',
        'submitted_for_review',
        'ai_reviewed',
        'admin_review_required',
        'returned_to_teacher',
        'approved',
        'published',
        'archived'
    )),
    
    -- Return feedback (when returned to teacher)
    return_reason TEXT,
    return_feedback JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI REVIEWS TABLE (AI QC analysis results)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    
    -- Bloom's Taxonomy
    primary_bloom_level INTEGER CHECK (primary_bloom_level BETWEEN 1 AND 6),
    secondary_bloom_levels INTEGER[] DEFAULT '{}',
    
    -- HOTS Analysis
    hots_flag BOOLEAN DEFAULT false,
    hots_strength TEXT CHECK (hots_strength IN ('S0', 'S1', 'S2')),
    hots_signals TEXT[] DEFAULT '{}',
    
    -- Boundedness
    boundedness TEXT CHECK (boundedness IN ('B0', 'B1', 'B2')),
    
    -- Difficulty Analysis
    difficulty_score INTEGER CHECK (difficulty_score BETWEEN 0 AND 10),
    difficulty_label TEXT CHECK (difficulty_label IN ('easy', 'medium', 'hard')),
    difficulty_reasons TEXT[] DEFAULT '{}',
    
    -- Quality Metrics
    clarity_score INTEGER CHECK (clarity_score BETWEEN 0 AND 100),
    ambiguity_flags TEXT[] DEFAULT '{}',
    missing_info_flags TEXT[] DEFAULT '{}',
    grade_fit_flags TEXT[] DEFAULT '{}',
    
    -- Alignment Scores
    subject_match_score INTEGER CHECK (subject_match_score BETWEEN 0 AND 100),
    topic_match_score INTEGER CHECK (topic_match_score BETWEEN 0 AND 100),
    
    -- Confidence Metrics (0.00 - 1.00)
    bloom_confidence DECIMAL(3,2),
    hots_confidence DECIMAL(3,2),
    difficulty_confidence DECIMAL(3,2),
    boundedness_confidence DECIMAL(3,2),
    
    -- Suggested Edits
    suggested_edits JSONB DEFAULT '[]',
    -- Format: [{goal, change_summary, before, after}]
    
    -- Full Report
    full_json_report JSONB,
    model_version TEXT DEFAULT 'qc-v1',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN REVIEWS TABLE (Moderation decisions)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Decision
    decision TEXT CHECK (decision IN ('approve', 'return', 'edit', 'archive')),
    
    -- Tag Overrides (null = keep AI values)
    override_bloom INTEGER CHECK (override_bloom IS NULL OR override_bloom BETWEEN 1 AND 6),
    override_hots_flag BOOLEAN,
    override_hots_strength TEXT CHECK (override_hots_strength IS NULL OR override_hots_strength IN ('S0', 'S1', 'S2')),
    override_difficulty TEXT CHECK (override_difficulty IS NULL OR override_difficulty IN ('easy', 'medium', 'hard')),
    override_boundedness TEXT CHECK (override_boundedness IS NULL OR override_boundedness IN ('B0', 'B1', 'B2')),
    
    -- Feedback
    notes TEXT,
    return_reasons TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HINT LOGS TABLE (Student hint usage tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS hint_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL,
    
    -- Hint content
    hint_type TEXT CHECK (hint_type IN (
        'clarify',      -- Simplify question
        'socratic',     -- Guiding questions
        'next_step',    -- Suggest next step
        'checklist',    -- Rubric checklist
        'template',     -- Structure/sentence starters
        'background'    -- Concept explanation
    )),
    hint_request TEXT,  -- What student asked
    hint_response TEXT, -- What AI responded
    
    -- Metrics
    tokens_used INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PERFORMANCE AGGREGATES TABLE (Empirical difficulty)
-- ============================================
CREATE TABLE IF NOT EXISTS performance_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE UNIQUE,
    
    -- Attempt statistics
    attempt_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    
    -- Time metrics
    median_time_seconds INTEGER,
    avg_time_seconds INTEGER,
    
    -- Performance
    accuracy_rate DECIMAL(5,2),  -- 0-100%
    hint_usage_rate DECIMAL(5,2), -- 0-100%
    avg_hints_per_attempt DECIMAL(3,1),
    
    -- Empirical difficulty (calculated from data)
    empirical_difficulty_score INTEGER CHECK (empirical_difficulty_score BETWEEN 0 AND 10),
    empirical_difficulty_label TEXT CHECK (empirical_difficulty_label IN ('easy', 'medium', 'hard')),
    
    -- Calibration
    needs_calibration BOOLEAN DEFAULT false,
    last_calibrated_at TIMESTAMPTZ,
    
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_author ON questions(author_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_grade_band ON questions(grade_band);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_question ON ai_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_question ON admin_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_reviewer ON admin_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_hint_logs_student ON hint_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_hint_logs_question ON hint_logs(question_id);
CREATE INDEX IF NOT EXISTS idx_performance_question ON performance_aggregates(question_id);
CREATE INDEX IF NOT EXISTS idx_performance_calibration ON performance_aggregates(needs_calibration) WHERE needs_calibration = true;

-- Questions pending admin review
CREATE INDEX IF NOT EXISTS idx_questions_admin_queue ON questions(status) 
    WHERE status = 'admin_review_required';

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- ============================================
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hint_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_aggregates ENABLE ROW LEVEL SECURITY;

-- Questions: Authors can see own, admins see all
CREATE POLICY "Authors can view own questions" ON questions
    FOR SELECT USING (author_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

CREATE POLICY "Authors can edit own draft questions" ON questions
    FOR UPDATE USING (author_id = auth.uid() AND status = 'draft');

CREATE POLICY "Teachers can insert questions" ON questions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
    );

-- AI Reviews: Readable by question author and admins
CREATE POLICY "AI reviews visible to author and admin" ON ai_reviews
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM questions q 
            WHERE q.id = ai_reviews.question_id 
            AND (q.author_id = auth.uid() OR 
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')))
    );

-- Hint logs: Students see own, teachers/admins see all
CREATE POLICY "Students see own hints" ON hint_logs
    FOR SELECT USING (student_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

CREATE POLICY "Students can request hints" ON hint_logs
    FOR INSERT WITH CHECK (
        student_id = auth.uid() AND
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student')
    );

-- ============================================
-- TRIGGER: Update updated_at on questions
-- ============================================
CREATE OR REPLACE FUNCTION update_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_questions_updated_at ON questions;
CREATE TRIGGER trigger_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_questions_updated_at();
