export interface Performance {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  call_time?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface Rehearsal {
  id: string;
  performance_id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  created_at: string;
}

export interface Part {
  id: string;
  performance_id: string;
  name: string;
  description: string;
  order: number;
  is_group?: boolean | null;
  created_at: string;
}

export interface Subpart {
  id: string;
  part_id: string;
  title: string;
  description: string | null;
  order: number;
  mode?: "position" | "order" | "both" | null;
  created_at: string;
}

export interface StagePosition {
  id: string;
  part_id: string;
  student_id: string;
  x: number;
  y: number;
  created_at: string;
}

export interface StudentSignup {
  id: string;
  performance_id: string;
  student_id: string;
  part_id: string;
  status: "registered" | "attended" | "cancelled";
  signed_up_at: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface RehearsalAttendance {
  id: string;
  rehearsal_id: string;
  student_id: string;
  status: "present" | "absent";
  created_at: string;
  updated_at: string;
}

export interface SoloAssignment {
  id: string;
  part_id: string;
  student_id: string;
  order: number | null;
  solo_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
}
