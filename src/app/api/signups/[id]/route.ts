import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// UPDATE signup
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { part_id, status, assigned_uniform_item_id } = await request.json();

    const { data: currentSignup } = await supabase
      .from("student_signups")
      .select("id, performance_id, student_id, assigned_uniform_item_id")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("student_signups")
      .update({ part_id, status, assigned_uniform_item_id })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (
      assigned_uniform_item_id === null &&
      currentSignup?.assigned_uniform_item_id &&
      currentSignup.performance_id &&
      currentSignup.student_id
    ) {
      try {
        await supabase
          .from("uniform_assignments")
          .delete()
          .eq("uniform_item_id", currentSignup.assigned_uniform_item_id)
          .eq("performance_id", currentSignup.performance_id)
          .eq("student_id", currentSignup.student_id)
          .is("returned_at", null)
          .is("distributed_at", null);
      } catch (syncErr) {
        console.error("Failed to clear uniform assignment on signup update:", syncErr);
      }
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Error updating signup:", error);
    return NextResponse.json(
      { error: "Failed to update signup" },
      { status: 500 }
    );
  }
}

// DELETE signup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from("student_signups")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting signup:", error);
    return NextResponse.json(
      { error: "Failed to delete signup" },
      { status: 500 }
    );
  }
}


