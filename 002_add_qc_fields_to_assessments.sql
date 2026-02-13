
-- Add QC fields to assessments table
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS qc_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS qc_notes TEXT,
ADD COLUMN IF NOT EXISTS qc_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS qc_reviewed_at TIMESTAMPTZ;

-- Add index for QC status filtering
CREATE INDEX IF NOT EXISTS idx_assessments_qc_status ON assessments(qc_status);

-- Comment on columns
COMMENT ON COLUMN assessments.qc_status IS 'Quality Control status: pending, approved, rejected, returned_to_teacher';
COMMENT ON COLUMN assessments.qc_notes IS 'Notes from the QC reviewer';
