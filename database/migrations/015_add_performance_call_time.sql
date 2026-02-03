-- Add call time to performances
ALTER TABLE performances ADD COLUMN IF NOT EXISTS call_time TEXT;
