-- FunLMS Kids Comprehensive Mock Data
-- Contains 2 generations of students with full test data for all features
-- Run this SQL in Supabase SQL Editor AFTER running the schema

-- =====================================================
-- CLEAR EXISTING DATA (required for fresh start)
-- =====================================================
DELETE FROM video_progress;
DELETE FROM submissions;
DELETE FROM attempts;
DELETE FROM progress;
DELETE FROM enrollments;
DELETE FROM books;
DELETE FROM videos;
DELETE FROM assessments;
DELETE FROM assignments;
DELETE FROM badges;
DELETE FROM classes;
DELETE FROM subjects;
DELETE FROM users;

-- =====================================================
-- USERS: Admin, Teachers, and 2 Generations of Students
-- =====================================================

-- Admin
INSERT INTO users (id, username, name, password, role, avatar)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrator', 'admin123', 'admin', '👑')
ON CONFLICT (username) DO NOTHING;

-- Teachers
INSERT INTO users (id, username, name, password, role, avatar) VALUES
('00000000-0000-0000-0000-000000000010', 'msjohnson', 'Ms. Johnson', 'teacher123', 'teacher', '👩‍🏫'),
('00000000-0000-0000-0000-000000000011', 'mrsmith', 'Mr. Smith', 'teacher123', 'teacher', '👨‍🏫'),
('00000000-0000-0000-0000-000000000012', 'mswilson', 'Ms. Wilson', 'teacher123', 'teacher', '👩‍🎨')
ON CONFLICT (username) DO NOTHING;

-- Generation 1: Grade 1 Students (younger, basic level)
INSERT INTO users (id, username, name, password, role, avatar, generation) VALUES
('00000000-0000-0000-0001-000000000001', 'alex', 'Alex', 'alex123', 'student', '🦁', '2025'),
('00000000-0000-0000-0001-000000000002', 'emma', 'Emma', 'emma123', 'student', '🦊', '2025'),
('00000000-0000-0000-0001-000000000003', 'leo', 'Leo', '1234', 'student', '🐼', '2025'),
('00000000-0000-0000-0001-000000000004', 'mia', 'Mia', 'mia123', 'student', '🐰', '2025'),
('00000000-0000-0000-0001-000000000005', 'noah', 'Noah', 'noah123', 'student', '🐸', '2025'),
('00000000-0000-0000-0001-000000000006', 'sofia', 'Sofia', 'sofia123', 'student', '🦋', '2025'),
('00000000-0000-0000-0001-000000000007', 'liam', 'Liam', 'liam123', 'student', '🐶', '2025'),
('00000000-0000-0000-0001-000000000008', 'ava', 'Ava', 'ava123', 'student', '🐱', '2025')
ON CONFLICT (username) DO NOTHING;

-- Generation 2: Grade 2 Students (older, more advanced - previous year)
INSERT INTO users (id, username, name, password, role, avatar, generation) VALUES
('00000000-0000-0000-0002-000000000001', 'jack', 'Jack', 'jack123', 'student', '🦖', '2024'),
('00000000-0000-0000-0002-000000000002', 'chloe', 'Chloe', 'chloe123', 'student', '🦄', '2024'),
('00000000-0000-0000-0002-000000000003', 'ryan', 'Ryan', 'ryan123', 'student', '🐻', '2024'),
('00000000-0000-0000-0002-000000000004', 'lily', 'Lily', 'lily123', 'student', '🌸', '2024'),
('00000000-0000-0000-0002-000000000005', 'ethan', 'Ethan', 'ethan123', 'student', '🚀', '2024'),
('00000000-0000-0000-0002-000000000006', 'grace', 'Grace', 'grace123', 'student', '🌈', '2024'),
('00000000-0000-0000-0002-000000000007', 'mason', 'Mason', 'mason123', 'student', '🎸', '2024'),
('00000000-0000-0000-0002-000000000008', 'zoe', 'Zoe', 'zoe123', 'student', '🦩', '2024')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- SUBJECTS
-- =====================================================
INSERT INTO subjects (id, name, emoji) VALUES
('30000000-0000-0000-0000-000000000001', 'Mathematics', '🔢'),
('30000000-0000-0000-0000-000000000002', 'Science', '🔬'),
('30000000-0000-0000-0000-000000000003', 'Reading', '📚'),
('30000000-0000-0000-0000-000000000004', 'English', '🔤'),
('30000000-0000-0000-0000-000000000005', 'Art', '🎨'),
('30000000-0000-0000-0000-000000000006', 'Music', '🎵')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CLASSES: 2 Generations (Grade 1 and Grade 2)
-- =====================================================
INSERT INTO classes (id, name, emoji, description, level, teacher_id) VALUES
('10000000-0000-0000-0001-000000000001', 'Grade 1A - Lion Cubs', '🦁', 'First grade class A for beginners', 'Grade 1', '00000000-0000-0000-0000-000000000010'),
('10000000-0000-0000-0001-000000000002', 'Grade 1B - Little Stars', '⭐', 'First grade class B', 'Grade 1', '00000000-0000-0000-0000-000000000011'),
('10000000-0000-0000-0002-000000000001', 'Grade 2A - Super Heroes', '🦸', 'Second grade advanced class', 'Grade 2', '00000000-0000-0000-0000-000000000010'),
('10000000-0000-0000-0002-000000000002', 'Grade 2B - Explorers', '🧭', 'Second grade exploration class', 'Grade 2', '00000000-0000-0000-0000-000000000012')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ENROLLMENTS: Assign students to classes
-- =====================================================
-- Grade 1A students
INSERT INTO enrollments (student_id, class_id) VALUES
('00000000-0000-0000-0001-000000000001', '10000000-0000-0000-0001-000000000001'),
('00000000-0000-0000-0001-000000000002', '10000000-0000-0000-0001-000000000001'),
('00000000-0000-0000-0001-000000000003', '10000000-0000-0000-0001-000000000001'),
('00000000-0000-0000-0001-000000000004', '10000000-0000-0000-0001-000000000001')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Grade 1B students
INSERT INTO enrollments (student_id, class_id) VALUES
('00000000-0000-0000-0001-000000000005', '10000000-0000-0000-0001-000000000002'),
('00000000-0000-0000-0001-000000000006', '10000000-0000-0000-0001-000000000002'),
('00000000-0000-0000-0001-000000000007', '10000000-0000-0000-0001-000000000002'),
('00000000-0000-0000-0001-000000000008', '10000000-0000-0000-0001-000000000002')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Grade 2A students
INSERT INTO enrollments (student_id, class_id) VALUES
('00000000-0000-0000-0002-000000000001', '10000000-0000-0000-0002-000000000001'),
('00000000-0000-0000-0002-000000000002', '10000000-0000-0000-0002-000000000001'),
('00000000-0000-0000-0002-000000000003', '10000000-0000-0000-0002-000000000001'),
('00000000-0000-0000-0002-000000000004', '10000000-0000-0000-0002-000000000001')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- Grade 2B students
INSERT INTO enrollments (student_id, class_id) VALUES
('00000000-0000-0000-0002-000000000005', '10000000-0000-0000-0002-000000000002'),
('00000000-0000-0000-0002-000000000006', '10000000-0000-0000-0002-000000000002'),
('00000000-0000-0000-0002-000000000007', '10000000-0000-0000-0002-000000000002'),
('00000000-0000-0000-0002-000000000008', '10000000-0000-0000-0002-000000000002')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- =====================================================
-- BADGES
-- =====================================================
INSERT INTO badges (id, name, emoji, description, condition_type, condition_value) VALUES
('50000000-0000-0000-0000-000000000001', 'First Steps', '🎯', 'Complete your first quiz', 'quizzes_completed', 1),
('50000000-0000-0000-0000-000000000002', 'Quiz Master', '🏆', 'Complete 10 quizzes', 'quizzes_completed', 10),
('50000000-0000-0000-0000-000000000003', 'Perfect Score', '💯', 'Get 100% on any quiz', 'perfect_score', 1),
('50000000-0000-0000-0000-000000000004', 'Bookworm', '📖', 'Read 5 books', 'books_read', 5),
('50000000-0000-0000-0000-000000000005', 'Streak Hero', '🔥', 'Maintain 7-day streak', 'streak', 7),
('50000000-0000-0000-0000-000000000006', 'Level Up', '⬆️', 'Reach Level 5', 'level', 5),
('50000000-0000-0000-0000-000000000007', 'Super Star', '⭐', 'Earn 500 XP', 'xp', 500),
('50000000-0000-0000-0000-000000000008', 'Video Scholar', '🎬', 'Watch 10 videos', 'videos_watched', 10),
('50000000-0000-0000-0000-000000000009', 'Early Bird', '🌅', 'Complete work before 9 AM', 'early_complete', 1),
('50000000-0000-0000-0000-000000000010', 'Weekend Warrior', '🦸', 'Study on weekend', 'weekend_study', 1)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STUDENT PROGRESS: Various levels and XP
-- =====================================================
-- Grade 1 students (lower levels) - with subject_xp breakdown
INSERT INTO progress (user_id, xp, total_xp, level, streak, last_activity_date, badges, subject_xp) VALUES
('00000000-0000-0000-0001-000000000001', 150, 150, 2, 3, CURRENT_DATE, ARRAY['50000000-0000-0000-0000-000000000001']::UUID[], '{"30000000-0000-0000-0000-000000000001": 50, "30000000-0000-0000-0000-000000000004": 100}'::jsonb),
('00000000-0000-0000-0001-000000000002', 80, 80, 1, 1, CURRENT_DATE - 1, ARRAY[]::UUID[], '{"30000000-0000-0000-0000-000000000004": 80}'::jsonb),
('00000000-0000-0000-0001-000000000003', 250, 250, 3, 5, CURRENT_DATE, ARRAY['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003']::UUID[], '{"30000000-0000-0000-0000-000000000001": 100, "30000000-0000-0000-0000-000000000002": 50, "30000000-0000-0000-0000-000000000004": 100}'::jsonb),
('00000000-0000-0000-0001-000000000004', 120, 120, 2, 2, CURRENT_DATE - 2, ARRAY['50000000-0000-0000-0000-000000000001']::UUID[], '{"30000000-0000-0000-0000-000000000001": 60, "30000000-0000-0000-0000-000000000004": 60}'::jsonb),
('00000000-0000-0000-0001-000000000005', 50, 50, 1, 0, CURRENT_DATE - 5, ARRAY[]::UUID[], '{"30000000-0000-0000-0000-000000000004": 50}'::jsonb),
('00000000-0000-0000-0001-000000000006', 180, 180, 2, 4, CURRENT_DATE, ARRAY['50000000-0000-0000-0000-000000000001']::UUID[], '{"30000000-0000-0000-0000-000000000001": 80, "30000000-0000-0000-0000-000000000004": 100}'::jsonb),
('00000000-0000-0000-0001-000000000007', 90, 90, 1, 1, CURRENT_DATE - 1, ARRAY[]::UUID[], '{"30000000-0000-0000-0000-000000000001": 40, "30000000-0000-0000-0000-000000000004": 50}'::jsonb),
('00000000-0000-0000-0001-000000000008', 200, 200, 2, 3, CURRENT_DATE, ARRAY['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003']::UUID[], '{"30000000-0000-0000-0000-000000000001": 100, "30000000-0000-0000-0000-000000000004": 100}'::jsonb)
ON CONFLICT (user_id) DO UPDATE SET xp = EXCLUDED.xp, total_xp = EXCLUDED.total_xp, level = EXCLUDED.level, streak = EXCLUDED.streak, subject_xp = EXCLUDED.subject_xp;

-- Grade 2 students (higher levels) - with subject_xp breakdown
INSERT INTO progress (user_id, xp, total_xp, level, streak, last_activity_date, badges, subject_xp) VALUES
('00000000-0000-0000-0002-000000000001', 520, 520, 6, 8, CURRENT_DATE, ARRAY['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000007']::UUID[], '{"30000000-0000-0000-0000-000000000001": 200, "30000000-0000-0000-0000-000000000002": 180, "30000000-0000-0000-0000-000000000003": 140}'::jsonb),
('00000000-0000-0000-0002-000000000002', 380, 380, 4, 5, CURRENT_DATE, ARRAY['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003']::UUID[], '{"30000000-0000-0000-0000-000000000001": 180, "30000000-0000-0000-0000-000000000002": 100, "30000000-0000-0000-0000-000000000003": 100}'::jsonb),
('00000000-0000-0000-0002-000000000003', 450, 450, 5, 7, CURRENT_DATE, ARRAY['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005']::UUID[], '{"30000000-0000-0000-0000-000000000001": 200, "30000000-0000-0000-0000-000000000002": 150, "30000000-0000-0000-0000-000000000003": 100}'::jsonb),
('00000000-0000-0000-0002-000000000004', 320, 320, 4, 3, CURRENT_DATE - 1, ARRAY['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003']::UUID[], '{"30000000-0000-0000-0000-000000000001": 150, "30000000-0000-0000-0000-000000000002": 100, "30000000-0000-0000-0000-000000000003": 70}'::jsonb),
('00000000-0000-0000-0002-000000000005', 280, 280, 3, 2, CURRENT_DATE - 2, ARRAY['50000000-0000-0000-0000-000000000001']::UUID[], '{"30000000-0000-0000-0000-000000000001": 140, "30000000-0000-0000-0000-000000000002": 80, "30000000-0000-0000-0000-000000000003": 60}'::jsonb),
('00000000-0000-0000-0002-000000000006', 600, 600, 7, 12, CURRENT_DATE, ARRAY['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000007']::UUID[], '{"30000000-0000-0000-0000-000000000001": 250, "30000000-0000-0000-0000-000000000002": 200, "30000000-0000-0000-0000-000000000003": 150}'::jsonb),
('00000000-0000-0000-0002-000000000007', 220, 220, 3, 1, CURRENT_DATE - 3, ARRAY['50000000-0000-0000-0000-000000000001']::UUID[], '{"30000000-0000-0000-0000-000000000001": 100, "30000000-0000-0000-0000-000000000002": 70, "30000000-0000-0000-0000-000000000003": 50}'::jsonb),
('00000000-0000-0000-0002-000000000008', 410, 410, 5, 6, CURRENT_DATE, ARRAY['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003']::UUID[], '{"30000000-0000-0000-0000-000000000001": 180, "30000000-0000-0000-0000-000000000002": 130, "30000000-0000-0000-0000-000000000003": 100}'::jsonb)
ON CONFLICT (user_id) DO UPDATE SET xp = EXCLUDED.xp, total_xp = EXCLUDED.total_xp, level = EXCLUDED.level, streak = EXCLUDED.streak, subject_xp = EXCLUDED.subject_xp;

-- =====================================================
-- BOOKS: For each class
-- =====================================================
INSERT INTO books (id, title, author, description, cover_emoji, category, content_text, class_id, teacher_id) VALUES
('60000000-0000-0000-0001-000000000001', 'ABC Adventures', 'Mary Learn', 'Learn the alphabet with fun stories!', '🔤', 'Reading', 'A is for Apple. B is for Ball. C is for Cat. This book teaches children the alphabet through fun stories and pictures.', '10000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000010'),
('60000000-0000-0000-0001-000000000002', 'Numbers 1-10', 'Count Master', 'Count from 1 to 10 with colorful pictures', '🔢', 'Mathematics', 'One apple, two bananas, three oranges. Learn to count with this fun book!', '10000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000010'),
('60000000-0000-0000-0001-000000000003', 'My First Animals', 'Nature Kids', 'Discover amazing animals', '🦁', 'Science', 'Lions live in Africa. They are called the King of the Jungle. Elephants are the largest land animals.', '10000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000010'),
('60000000-0000-0000-0002-000000000001', 'Math Champions', 'Prof. Numbers', 'Addition and subtraction for Grade 2', '➕', 'Mathematics', '2 + 2 = 4. When we add, we put things together. 5 - 3 = 2. When we subtract, we take away.', '10000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000010'),
('60000000-0000-0000-0002-000000000002', 'Science Explorers', 'Dr. Discovery', 'Explore the world of science', '🔬', 'Science', 'Plants need water, sunlight, and soil to grow. The water cycle: evaporation, condensation, precipitation.', '10000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000010'),
('60000000-0000-0000-0002-000000000003', 'Reading Adventures', 'Story Teller', 'Fun stories for young readers', '📖', 'Reading', 'Once upon a time, there was a brave little mouse who wanted to explore the world.', '10000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000010')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VIDEOS: Educational content
-- =====================================================
INSERT INTO videos (id, title, description, url, duration, class_id, subject_id, teacher_id) VALUES
('70000000-0000-0000-0001-000000000001', 'Learn Your ABCs', 'Sing along and learn the alphabet!', 'https://www.youtube.com/watch?v=75p-N9YKqNo', 180, '10000000-0000-0000-0001-000000000001', '30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010'),
('70000000-0000-0000-0001-000000000002', 'Counting to 10', 'Fun counting video with animations', 'https://www.youtube.com/watch?v=Aq4UAss33qA', 240, '10000000-0000-0000-0001-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010'),
('70000000-0000-0000-0001-000000000003', 'Animal Sounds', 'Learn what sounds animals make', 'https://www.youtube.com/watch?v=t99ULJjCsaM', 300, '10000000-0000-0000-0001-000000000001', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010'),
('70000000-0000-0000-0002-000000000001', 'Addition Song', 'Learn to add with music!', 'https://www.youtube.com/watch?v=PMnvKUNwmto', 200, '10000000-0000-0000-0002-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010'),
('70000000-0000-0000-0002-000000000002', 'The Water Cycle', 'Learn about evaporation and rain', 'https://www.youtube.com/watch?v=ncORPosDrjI', 360, '10000000-0000-0000-0002-000000000001', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ASSESSMENTS: Quizzes for each class
-- =====================================================
-- Grade 1 Quizzes
INSERT INTO assessments (id, title, description, type, class_id, teacher_id, subject_id, is_active, questions, settings) VALUES
('80000000-0000-0000-0001-000000000001', 'Alphabet Quiz', 'Test your ABC knowledge!', 'quiz', '10000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000004', true,
'[{"id":"q1","prompt":"What letter comes after A?","options":[{"id":"a","text":"B"},{"id":"b","text":"C"},{"id":"c","text":"D"}],"correctAnswer":"a"},{"id":"q2","prompt":"What letter is this: 🍎 Apple starts with...","options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"P"}],"correctAnswer":"a"},{"id":"q3","prompt":"Which letter makes the sound \"Buh\"?","options":[{"id":"a","text":"D"},{"id":"b","text":"B"},{"id":"c","text":"P"}],"correctAnswer":"b"}]',
'{"aiHints": true, "hintLimit": 3, "shuffleQuestions": false}'::jsonb),

('80000000-0000-0000-0001-000000000002', 'Numbers 1-5', 'Count and match numbers!', 'quiz', '10000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000001', true,
'[{"id":"q1","prompt":"How many apples? 🍎🍎🍎","options":[{"id":"a","text":"2"},{"id":"b","text":"3"},{"id":"c","text":"4"}],"correctAnswer":"b"},{"id":"q2","prompt":"What number comes after 4?","options":[{"id":"a","text":"3"},{"id":"b","text":"5"},{"id":"c","text":"6"}],"correctAnswer":"b"},{"id":"q3","prompt":"1 + 1 = ?","options":[{"id":"a","text":"1"},{"id":"b","text":"2"},{"id":"c","text":"3"}],"correctAnswer":"b"}]',
'{"aiHints": true, "hintLimit": 3}'::jsonb),

('80000000-0000-0000-0001-000000000003', 'Animal Friends', 'Learn about animals!', 'quiz', '10000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000002', true,
'[{"id":"q1","prompt":"What sound does a dog make?","options":[{"id":"a","text":"Meow"},{"id":"b","text":"Woof"},{"id":"c","text":"Moo"}],"correctAnswer":"b"},{"id":"q2","prompt":"Which animal lives in water?","options":[{"id":"a","text":"Lion"},{"id":"b","text":"Fish"},{"id":"c","text":"Bird"}],"correctAnswer":"b"}]',
'{"aiHints": true, "hintLimit": 2}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Grade 2 Quizzes
INSERT INTO assessments (id, title, description, type, class_id, teacher_id, subject_id, is_active, questions, settings) VALUES
('80000000-0000-0000-0002-000000000001', 'Addition Master', 'Practice adding numbers!', 'quiz', '10000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000001', true,
'[{"id":"q1","prompt":"5 + 3 = ?","options":[{"id":"a","text":"7"},{"id":"b","text":"8"},{"id":"c","text":"9"}],"correctAnswer":"b"},{"id":"q2","prompt":"10 + 5 = ?","options":[{"id":"a","text":"14"},{"id":"b","text":"15"},{"id":"c","text":"16"}],"correctAnswer":"b"},{"id":"q3","prompt":"7 + 4 = ?","options":[{"id":"a","text":"10"},{"id":"b","text":"11"},{"id":"c","text":"12"}],"correctAnswer":"b"},{"id":"q4","prompt":"8 + 8 = ?","options":[{"id":"a","text":"15"},{"id":"b","text":"16"},{"id":"c","text":"17"}],"correctAnswer":"b"}]',
'{"aiHints": true, "hintLimit": 3, "shuffleQuestions": true}'::jsonb),

('80000000-0000-0000-0002-000000000002', 'Science Explorer Quiz', 'Test your science knowledge!', 'quiz', '10000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000002', true,
'[{"id":"q1","prompt":"What do plants need to grow?","options":[{"id":"a","text":"Just water"},{"id":"b","text":"Water, sunlight, and soil"},{"id":"c","text":"Only sunlight"}],"correctAnswer":"b"},{"id":"q2","prompt":"What is the water cycle?","options":[{"id":"a","text":"Water moves in a circle"},{"id":"b","text":"Water stays still"},{"id":"c","text":"Water disappears"}],"correctAnswer":"a"},{"id":"q3","prompt":"Which is a living thing?","options":[{"id":"a","text":"Rock"},{"id":"b","text":"Tree"},{"id":"c","text":"Water"}],"correctAnswer":"b"}]',
'{"aiHints": true, "hintLimit": 2}'::jsonb),

('80000000-0000-0000-0002-000000000003', 'Reading Comprehension', 'Read and answer questions', 'written_exam', '10000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000003', true,
'[{"id":"q1","prompt":"Write a sentence about your favorite animal.","type":"essay"},{"id":"q2","prompt":"What did you learn from the story?","type":"essay"}]',
'{"allowDrawing": true, "aiHints": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ATTEMPTS: Quiz attempts by students
-- =====================================================
-- Grade 1 quiz attempts
INSERT INTO attempts (user_id, assessment_id, score, answers, completed_at, hints_used) VALUES
('00000000-0000-0000-0001-000000000001', '80000000-0000-0000-0001-000000000001', 100, '{"q1":"a","q2":"a","q3":"b"}', NOW() - INTERVAL '2 days', 0),
('00000000-0000-0000-0001-000000000001', '80000000-0000-0000-0001-000000000002', 67, '{"q1":"b","q2":"b","q3":"a"}', NOW() - INTERVAL '1 day', 1),
('00000000-0000-0000-0001-000000000002', '80000000-0000-0000-0001-000000000001', 67, '{"q1":"a","q2":"b","q3":"b"}', NOW() - INTERVAL '3 days', 2),
('00000000-0000-0000-0001-000000000003', '80000000-0000-0000-0001-000000000001', 100, '{"q1":"a","q2":"a","q3":"b"}', NOW() - INTERVAL '1 day', 0),
('00000000-0000-0000-0001-000000000003', '80000000-0000-0000-0001-000000000002', 100, '{"q1":"b","q2":"b","q3":"b"}', NOW(), 0),
('00000000-0000-0000-0001-000000000003', '80000000-0000-0000-0001-000000000003', 100, '{"q1":"b","q2":"b"}', NOW(), 0)
ON CONFLICT DO NOTHING;

-- Grade 2 quiz attempts
INSERT INTO attempts (user_id, assessment_id, score, answers, completed_at, hints_used) VALUES
('00000000-0000-0000-0002-000000000001', '80000000-0000-0000-0002-000000000001', 100, '{"q1":"b","q2":"b","q3":"b","q4":"b"}', NOW() - INTERVAL '1 day', 0),
('00000000-0000-0000-0002-000000000001', '80000000-0000-0000-0002-000000000002', 100, '{"q1":"b","q2":"a","q3":"b"}', NOW(), 0),
('00000000-0000-0000-0002-000000000002', '80000000-0000-0000-0002-000000000001', 75, '{"q1":"b","q2":"b","q3":"a","q4":"b"}', NOW() - INTERVAL '2 days', 1),
('00000000-0000-0000-0002-000000000003', '80000000-0000-0000-0002-000000000001', 100, '{"q1":"b","q2":"b","q3":"b","q4":"b"}', NOW() - INTERVAL '1 day', 0),
('00000000-0000-0000-0002-000000000006', '80000000-0000-0000-0002-000000000001', 100, '{"q1":"b","q2":"b","q3":"b","q4":"b"}', NOW(), 0),
('00000000-0000-0000-0002-000000000006', '80000000-0000-0000-0002-000000000002', 100, '{"q1":"b","q2":"a","q3":"b"}', NOW(), 0)
ON CONFLICT DO NOTHING;

-- =====================================================
-- VIDEO PROGRESS: Track video watching
-- =====================================================
INSERT INTO video_progress (user_id, video_id, watched_seconds, completed, completed_at) VALUES
('00000000-0000-0000-0001-000000000001', '70000000-0000-0000-0001-000000000001', 180, true, NOW() - INTERVAL '3 days'),
('00000000-0000-0000-0001-000000000001', '70000000-0000-0000-0001-000000000002', 120, false, NULL),
('00000000-0000-0000-0001-000000000003', '70000000-0000-0000-0001-000000000001', 180, true, NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0001-000000000003', '70000000-0000-0000-0001-000000000002', 240, true, NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0001-000000000003', '70000000-0000-0000-0001-000000000003', 300, true, NOW()),
('00000000-0000-0000-0002-000000000001', '70000000-0000-0000-0002-000000000001', 200, true, NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0002-000000000001', '70000000-0000-0000-0002-000000000002', 360, true, NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0002-000000000006', '70000000-0000-0000-0002-000000000001', 200, true, NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0002-000000000006', '70000000-0000-0000-0002-000000000002', 360, true, NOW())
ON CONFLICT (user_id, video_id) DO NOTHING;

-- =====================================================
-- ASSIGNMENTS: Homework tasks
-- =====================================================
INSERT INTO assignments (id, title, description, class_id, due_date) VALUES
('90000000-0000-0000-0001-000000000001', 'Draw Your Favorite Letter', 'Draw and color your favorite letter from the alphabet', '10000000-0000-0000-0001-000000000001', NOW() + INTERVAL '7 days'),
('90000000-0000-0000-0001-000000000002', 'Count Objects at Home', 'Count 5 different objects in your home and write them down', '10000000-0000-0000-0001-000000000001', NOW() + INTERVAL '5 days'),
('90000000-0000-0000-0002-000000000001', 'Math Worksheet', 'Complete the addition and subtraction worksheet', '10000000-0000-0000-0002-000000000001', NOW() + INTERVAL '3 days'),
('90000000-0000-0000-0002-000000000002', 'Science Journal', 'Write about what you observe in nature', '10000000-0000-0000-0002-000000000001', NOW() + INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Users: 1 admin, 3 teachers, 16 students (8 per generation)
-- Classes: 4 (2 for Grade 1, 2 for Grade 2)
-- Subjects: 6
-- Books: 6 (3 per generation)
-- Videos: 5
-- Quizzes: 6
-- Badges: 10
-- Assignments: 4

SELECT 'Mock data inserted successfully!' as status;
SELECT 'Test Accounts:' as info;
SELECT '- Admin: admin / admin123' as account;
SELECT '- Teacher: msjohnson / teacher123' as account;
SELECT '- Grade 1 Student: alex / alex123' as account;
SELECT '- Grade 2 Student: jack / jack123' as account;
