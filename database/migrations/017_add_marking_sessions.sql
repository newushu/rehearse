-- Add marking sessions for timepoint logging
CREATE TABLE IF NOT EXISTS marking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_id UUID NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
  title TEXT,
  rows JSONB NOT NULL,
  assignments JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marking_sessions_performance_id ON marking_sessions(performance_id);
