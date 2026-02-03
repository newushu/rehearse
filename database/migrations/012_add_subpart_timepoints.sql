-- Add timepoint tracking to subparts
ALTER TABLE subparts ADD COLUMN IF NOT EXISTS timepoint_seconds DECIMAL(8,2);
ALTER TABLE subparts ADD COLUMN IF NOT EXISTS timepoint_end_seconds DECIMAL(8,2);
