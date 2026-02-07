-- Add assigned uniform item per performance signup
ALTER TABLE student_signups
  ADD COLUMN IF NOT EXISTS assigned_uniform_item_id UUID REFERENCES uniform_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_signups_assigned_uniform ON student_signups(assigned_uniform_item_id);
