-- Add start/end side info for assigned roster entries
ALTER TABLE subpart_order
  ADD COLUMN IF NOT EXISTS start_side TEXT;

ALTER TABLE subpart_order
  ADD COLUMN IF NOT EXISTS end_side TEXT;
