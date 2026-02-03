-- Make student email optional (admin roster)
ALTER TABLE students
  ALTER COLUMN email DROP NOT NULL;
