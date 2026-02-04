import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// UPDATE part
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, order, timepoint_seconds, timepoint_end_seconds, is_group, timeline_row } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (is_group !== undefined) updateData.is_group = is_group;
    if (timepoint_seconds !== undefined) updateData.timepoint_seconds = parseFloat(timepoint_seconds);
    if (timepoint_end_seconds !== undefined) updateData.timepoint_end_seconds = timepoint_end_seconds ? parseFloat(timepoint_end_seconds) : null;
    if (timeline_row !== undefined) updateData.timeline_row = timeline_row === null || timeline_row === "" ? null : parseInt(timeline_row, 10);

    console.log("Updating part with data:", { id, updateData });

    const { data, error } = await supabase
      .from("parts")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("No data returned after update");
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Error updating part:", error);
    return NextResponse.json(
      { error: "Failed to update part", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE part
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from("parts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting part:", error);
    return NextResponse.json(
      { error: "Failed to delete part" },
      { status: 500 }
    );
  }
}
