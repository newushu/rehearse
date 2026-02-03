-- Subparts for each part (with optional positioning later)
CREATE TABLE IF NOT EXISTS subparts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  mode TEXT DEFAULT 'position' CHECK (mode IN ('position', 'order', 'both')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subparts_part_id ON subparts(part_id);
