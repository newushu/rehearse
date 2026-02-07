-- Rehearse mode notes for parts/subparts
CREATE TABLE IF NOT EXISTS rehearse_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_id UUID NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  subpart_id UUID REFERENCES subparts(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(performance_id, part_id, subpart_id)
);

CREATE INDEX IF NOT EXISTS idx_rehearse_notes_performance ON rehearse_notes(performance_id);
CREATE INDEX IF NOT EXISTS idx_rehearse_notes_part ON rehearse_notes(part_id);
CREATE INDEX IF NOT EXISTS idx_rehearse_notes_subpart ON rehearse_notes(subpart_id);
