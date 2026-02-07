import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// UPDATE solo assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { order, solo_name, notes } = await request.json();

    const updateData: any = {};
    if (order !== undefined) updateData.order = order;
    if (solo_name !== undefined) updateData.solo_name = solo_name;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from("solo_assignments")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0]);
  } catch (error) {
    console.error("Error updating solo assignment:", error);
    return NextResponse.json(
      { error: "Failed to update solo assignment" },
      { status: 500 }
    );
  }
}


