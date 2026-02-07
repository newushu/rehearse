import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const baseSelect = `
        id,
        student_id,
        assigned_uniform_item_id,
        students(name, email),
        part_id,
        parts(name)
      `;
    let { data, error } = await supabase
      .from("student_signups")
      .select(baseSelect)
      .eq("performance_id", id);

    if (error) {
      // Fallback for databases that haven't applied the assigned_uniform_item_id migration yet.
      const fallback = await supabase
        .from("student_signups")
        .select(`
          id,
          student_id,
          students(name, email),
          part_id,
          parts(name)
        `)
        .eq("performance_id", id);
      data = fallback.data as any;
      error = fallback.error;
    }

    if (error) throw error;

    // Transform data to flatten the structure
    const roster = (data || []).map((signup: any) => ({
      signup_id: signup.id,
      student_id: signup.student_id,
      name: signup.students?.name || "Unknown",
      email: signup.students?.email || "",
      part_id: signup.part_id,
      part_name: signup.parts?.name || null,
      assigned_uniform_item_id: signup.assigned_uniform_item_id || null,
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


