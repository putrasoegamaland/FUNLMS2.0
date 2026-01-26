-- Add generation column to users table
-- Run this SQL in Supabase SQL Editor to add the generation column

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'generation'
    ) THEN
        ALTER TABLE users ADD COLUMN generation TEXT;
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'generation';
