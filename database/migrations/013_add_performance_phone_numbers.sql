-- Add phone numbers to performances
ALTER TABLE performances ADD COLUMN IF NOT EXISTS phone_numbers TEXT;
