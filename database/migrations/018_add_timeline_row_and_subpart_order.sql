-- Add timeline row persistence for parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS timeline_row INTEGER;

-- Add explicit ordering for subparts
ALTER TABLE subparts ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_parts_timeline_row ON parts(timeline_row);
CREATE INDEX IF NOT EXISTS idx_subparts_order ON subparts("order");
