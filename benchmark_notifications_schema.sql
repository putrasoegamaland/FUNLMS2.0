-- Multi-Class Quiz Assignment & Benchmark Notifications Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- FEATURE 1: Multi-Class Quiz Assignment
-- ============================================

-- Add class_ids array column to assessments (keep class_id for backwards compatibility)
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS class_ids UUID[] DEFAULT '{}';

-- Migrate existing class_id to class_ids array
UPDATE assessments 
SET class_ids = ARRAY[class_id]
WHERE class_id IS NOT NULL AND (class_ids IS NULL OR array_length(class_ids, 1) IS NULL);

-- ============================================
-- FEATURE 2: Benchmark Grade Notifications
-- ============================================

-- Subject benchmarks (admin-configurable, global per subject)
CREATE TABLE IF NOT EXISTS subject_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    minimum_grade INTEGER NOT NULL DEFAULT 70,  -- Percentage (0-100)
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id)
);

-- Teacher notifications
CREATE TABLE IF NOT EXISTS teacher_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('below_benchmark', 'new_submission', 'system')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',  -- { student_id, student_name, assessment_id, assessment_title, score, benchmark, subject_name }
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_teacher ON teacher_notifications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON teacher_notifications(teacher_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON teacher_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_benchmarks_subject ON subject_benchmarks(subject_id);

-- Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE subject_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read benchmarks" ON subject_benchmarks FOR SELECT USING (true);
CREATE POLICY "Admins can manage benchmarks" ON subject_benchmarks FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Teachers can read own notifications" ON teacher_notifications FOR SELECT 
    USING (teacher_id = auth.uid());
CREATE POLICY "Anyone can insert notifications" ON teacher_notifications FOR INSERT 
    WITH CHECK (true);
CREATE POLICY "Teachers can update own notifications" ON teacher_notifications FOR UPDATE 
    USING (teacher_id = auth.uid());

-- Seed default benchmarks for existing subjects (70% default)
INSERT INTO subject_benchmarks (subject_id, minimum_grade)
SELECT id, 70 FROM subjects
ON CONFLICT (subject_id) DO NOTHING;
