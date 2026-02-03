-- Add group/solo flag to parts
ALTER TABLE parts
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT TRUE;
