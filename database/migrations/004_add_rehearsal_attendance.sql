-- Rehearsal Attendance Table
CREATE TABLE IF NOT EXISTS rehearsal_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES rehearsals(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(rehearsal_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_rehearsal_attendance_rehearsal_id ON rehearsal_attendance(rehearsal_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_attendance_student_id ON rehearsal_attendance(student_id);
