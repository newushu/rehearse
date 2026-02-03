-- Solo assignments per part
CREATE TABLE IF NOT EXISTS solo_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "order" INTEGER,
  solo_name TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- allow repeats of the same student for multiple solos
);

CREATE INDEX IF NOT EXISTS idx_solo_assignments_part_id ON solo_assignments(part_id);
CREATE INDEX IF NOT EXISTS idx_solo_assignments_student_id ON solo_assignments(student_id);
