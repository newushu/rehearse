import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// UPDATE subpart
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, description, order, mode, timepoint_seconds, timepoint_end_seconds } = await request.json();

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (mode !== undefined) updateData.mode = mode;
    if (timepoint_seconds !== undefined) {
      updateData.timepoint_seconds = timepoint_seconds === null || timepoint_seconds === ""
        ? null
        : parseFloat(timepoint_seconds);
    }
    if (timepoint_end_seconds !== undefined) {
      updateData.timepoint_end_seconds = timepoint_end_seconds === null || timepoint_end_seconds === ""
        ? null
        : parseFloat(timepoint_end_seconds);
    }

    const { data, error } = await supabase
      .from("subparts")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0]);
  } catch (error) {
    console.error("Error updating subpart:", error);
    const details =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : String(error);
    return NextResponse.json(
      { error: "Failed to update subpart", details },
      { status: 500 }
    );
  }
}

// DELETE subpart
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from("subparts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subpart:", error);
    return NextResponse.json(
      { error: "Failed to delete subpart" },
      { status: 500 }
    );
  }
}


