-- Subpart positions
CREATE TABLE IF NOT EXISTS subpart_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subpart_id UUID NOT NULL REFERENCES subparts(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subpart_positions_subpart_id ON subpart_positions(subpart_id);

-- Subpart order list
CREATE TABLE IF NOT EXISTS subpart_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subpart_id UUID NOT NULL REFERENCES subparts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subpart_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_subpart_order_subpart_id ON subpart_order(subpart_id);
