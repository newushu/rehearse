-- Allow duplicate students in subpart order
ALTER TABLE subpart_order
  DROP CONSTRAINT IF EXISTS subpart_order_subpart_id_student_id_key;
