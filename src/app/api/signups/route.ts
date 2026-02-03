import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET signups
export async function GET(request: NextRequest) {
  try {
    const performanceId = request.nextUrl.searchParams.get("performanceId");
    const studentId = request.nextUrl.searchParams.get("studentId");

    let query = supabase.from("student_signups").select("*");

    if (performanceId) {
      query = query.eq("performance_id", performanceId);
    }

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching signups:", error);
    return NextResponse.json(
      { error: "Failed to fetch signups" },
      { status: 500 }
    );
  }
}

// POST new signup
export async function POST(request: NextRequest) {
  try {
    const { performance_id, student_id, part_id, status } = await request.json();

    if (!performance_id || !student_id) {
      return NextResponse.json(
        { error: "Missing required fields: performance_id, student_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("student_signups")
      .insert([
        {
          performance_id,
          student_id,
          part_id,
          status: status || "registered",
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error creating signup:", error);
    return NextResponse.json(
      { error: "Failed to create signup" },
      { status: 500 }
    );
  }
}
