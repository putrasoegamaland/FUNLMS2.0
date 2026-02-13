
-- Fix foreign key for qc_reviewed_by to reference public.users instead of auth.users
ALTER TABLE assessments 
DROP CONSTRAINT IF EXISTS assessments_qc_reviewed_by_fkey;

-- Re-add the constraint pointing to the correct users table
ALTER TABLE assessments
ADD CONSTRAINT assessments_qc_reviewed_by_fkey 
FOREIGN KEY (qc_reviewed_by) 
REFERENCES users(id);
