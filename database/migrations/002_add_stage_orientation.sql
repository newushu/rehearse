-- Add stage_orientation column to performances table
ALTER TABLE performances ADD COLUMN stage_orientation TEXT DEFAULT 'bottom';
