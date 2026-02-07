import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const {
      uniform_item_id,
      student_id,
      student_name,
      performance_id,
      distributed_at,
    } = await request.json();
    if (!uniform_item_id || (!student_id && !student_name)) {
      return NextResponse.json(
        { error: "Missing required fields: uniform_item_id and student info" },
        { status: 400 }
      );
    }

    const { data: active, error: activeError } = await supabase
      .from("uniform_assignments")
      .select("id")
      .eq("uniform_item_id", uniform_item_id)
      .is("returned_at", null)
      .limit(1);
    if (activeError) throw activeError;
    if (active && active.length > 0) {
      return NextResponse.json({ error: "Uniform is already assigned" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("uniform_assignments")
      .insert([
        {
          uniform_item_id,
          student_id: student_id || null,
          student_name: student_name || null,
          performance_id: performance_id || null,
          distributed_at: distributed_at ?? null,
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating uniform assignment:", error);
    return NextResponse.json({ error: "Failed to assign uniform" }, { status: 500 });
  }
}
