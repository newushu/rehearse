import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// UPDATE stage position
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { x, y, student_id } = await request.json();

    const { data, error } = await supabase
      .from("stage_positions")
      .update({ x, y, student_id, updated_at: new Date() })
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Error updating stage position:", error);
    return NextResponse.json(
      { error: "Failed to update stage position" },
      { status: 500 }
    );
  }
}

// DELETE stage position
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from("stage_positions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stage position:", error);
    return NextResponse.json(
      { error: "Failed to delete stage position" },
      { status: 500 }
    );
  }
}


