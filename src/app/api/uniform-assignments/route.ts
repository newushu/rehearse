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
    if (performance_id) {
      const { data: activeForPerf, error: perfError } = await supabase
        .from("uniform_assignments")
        .select("id, student_id")
        .eq("uniform_item_id", uniform_item_id)
        .eq("performance_id", performance_id)
        .is("returned_at", null);
      if (perfError) throw perfError;
      if (activeForPerf && activeForPerf.length > 0) {
        const sameStudent = activeForPerf.find((row: any) => row.student_id === student_id);
        if (sameStudent) {
          return NextResponse.json({ existing: true, id: sameStudent.id }, { status: 200 });
        }
        return NextResponse.json(
          { error: "Uniform already assigned for this performance" },
          { status: 409 }
        );
      }
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

    if (performance_id && student_id) {
      try {
        await supabase
          .from("student_signups")
          .update({ assigned_uniform_item_id: uniform_item_id })
          .eq("performance_id", performance_id)
          .eq("student_id", student_id);
      } catch (syncErr) {
        console.error("Failed to sync uniform assignment to signup:", syncErr);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating uniform assignment:", error);
    return NextResponse.json({ error: "Failed to assign uniform" }, { status: 500 });
  }
}
