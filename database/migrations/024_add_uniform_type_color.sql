-- Add color to uniform types for chip styling
ALTER TABLE uniform_types
  ADD COLUMN IF NOT EXISTS color TEXT;
