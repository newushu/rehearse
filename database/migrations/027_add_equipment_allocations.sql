-- Equipment allocations per performance and per part/subpart
CREATE TABLE IF NOT EXISTS performance_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_id UUID NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  initial_side TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES performance_equipment(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  subpart_id UUID REFERENCES subparts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_performance ON performance_equipment(performance_id);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_equipment ON equipment_usage(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_part ON equipment_usage(part_id);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_subpart ON equipment_usage(subpart_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_usage_unique
ON equipment_usage(equipment_id, part_id, COALESCE(subpart_id, '00000000-0000-0000-0000-000000000000'));
