-- Add timepoint tracking to parts for rehearse mode
ALTER TABLE parts ADD COLUMN timepoint_seconds DECIMAL(8,2) DEFAULT 0;
ALTER TABLE parts ADD COLUMN timepoint_end_seconds DECIMAL(8,2);

-- Add music file support to performances
ALTER TABLE performances ADD COLUMN music_file_path TEXT;
ALTER TABLE performances ADD COLUMN music_file_name TEXT;
