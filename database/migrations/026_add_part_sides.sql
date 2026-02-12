-- Side assignments for parts without subparts
CREATE TABLE IF NOT EXISTS part_sides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  start_side TEXT,
  end_side TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(part_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_part_sides_part_id ON part_sides(part_id);
