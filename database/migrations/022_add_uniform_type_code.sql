-- Add code prefix for uniform types
ALTER TABLE uniform_types
  ADD COLUMN IF NOT EXISTS code TEXT;

CREATE INDEX IF NOT EXISTS idx_uniform_types_code ON uniform_types(code);
