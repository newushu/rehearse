-- Add timezone to performances (IANA zone, e.g., America/New_York)
ALTER TABLE performances ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
