import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("student_signups")
      .select(`
        id,
        student_id,
        students(name, email),
        part_id,
        parts(name)
      `)
      .eq("performance_id", id);

    if (error) throw error;

    // Transform data to flatten the structure
    const roster = data.map((signup: any) => ({
      signup_id: signup.id,
      student_id: signup.student_id,
      name: signup.students?.name || "Unknown",
      email: signup.students?.email || "",
      part_id: signup.part_id,
      part_name: signup.parts?.name || null,
    }));

    return NextResponse.json(roster);
  } catch (error) {
    console.error("Error fetching roster:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 }
    );
  }
}
