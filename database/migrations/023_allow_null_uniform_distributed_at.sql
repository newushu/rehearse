-- Allow assignments without distribution timestamp
ALTER TABLE uniform_assignments
  ALTER COLUMN distributed_at DROP NOT NULL;
