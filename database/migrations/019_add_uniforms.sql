-- Uniform inventory tracking
CREATE TABLE IF NOT EXISTS uniform_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uniform_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uniform_type_id UUID NOT NULL REFERENCES uniform_types(id) ON DELETE CASCADE,
  item_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uniform_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uniform_item_id UUID NOT NULL REFERENCES uniform_items(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_name TEXT,
  performance_id UUID REFERENCES performances(id) ON DELETE SET NULL,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_uniform_items_type ON uniform_items(uniform_type_id);
CREATE INDEX IF NOT EXISTS idx_uniform_assignments_item ON uniform_assignments(uniform_item_id);
CREATE INDEX IF NOT EXISTS idx_uniform_assignments_student ON uniform_assignments(student_id);
